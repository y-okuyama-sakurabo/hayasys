# core/services/order_finalize.py
from django.db import transaction
from django.utils import timezone

from core.models import Vehicle, CustomerVehicle
from core.models.order_vehicle import OrderVehicle


def _normalize_blank_to_none(value):
    """空文字を None に寄せる（unique系の事故防止）"""
    if value is None:
        return None
    if isinstance(value, str) and value.strip() == "":
        return None
    return value


@transaction.atomic
def create_customer_vehicle_from_order(order):
    """
    受注(order)の商談車両（OrderVehicle.is_trade_in=False）から、
    Vehicle（実体）を作成/再利用し、CustomerVehicle（所有関係）を作成する。

    現所有の判定は:
      - CustomerVehicle.owned_to が NULL なら現所有
    """

    # 0) 前提チェック
    if not order or not getattr(order, "customer_id", None):
        return None

    if getattr(order, "vehicle_mode", None) != "sale":
        return None

    # 1) OrderVehicle（商談車両）を取得（1台想定）
    ov = (
        OrderVehicle.objects
        .filter(order=order, is_trade_in=False)
        .order_by("id")
        .first()
    )
    if not ov:
        return None

    order_date = getattr(order, "order_date", None) or timezone.now().date()

    # 2) Vehicle を決定（車台番号があれば最優先で再利用）
    chassis_no = _normalize_blank_to_none(ov.chassis_no)

    vehicle = None
    if chassis_no:
        vehicle = Vehicle.objects.filter(chassis_no=chassis_no).first()

    if vehicle:
        updates = {}

        if vehicle.category_id is None and ov.category_id:
            updates["category_id"] = ov.category_id

        if vehicle.color_id is None and ov.color_id:
            updates["color_id"] = ov.color_id

        if not vehicle.vehicle_name and ov.vehicle_name:
            updates["vehicle_name"] = ov.vehicle_name

        if vehicle.displacement is None and ov.displacement is not None:
            updates["displacement"] = ov.displacement

        if not vehicle.model_year and ov.model_year:
            updates["model_year"] = ov.model_year

        if not vehicle.new_car_type and ov.new_car_type:
            updates["new_car_type"] = ov.new_car_type

        if vehicle.manufacturer_id is None and ov.manufacturer_id:
            updates["manufacturer_id"] = ov.manufacturer_id

        if not vehicle.model_code and ov.model_code:
            updates["model_code"] = ov.model_code

        if not vehicle.color_name and ov.color_name:
            updates["color_name"] = ov.color_name

        if not vehicle.color_code and ov.color_code:
            updates["color_code"] = ov.color_code

        if not vehicle.engine_type and ov.engine_type:
            updates["engine_type"] = ov.engine_type

        if updates:
            for k, v in updates.items():
                setattr(vehicle, k, v)
            vehicle.save(update_fields=list(updates.keys()) + ["updated_at"])

    else:
        # 新規Vehicle作成
        vehicle = Vehicle.objects.create(
            vehicle_name=ov.vehicle_name or "",
            displacement=ov.displacement,
            model_year=ov.model_year or "",
            new_car_type=ov.new_car_type or "",
            manufacturer=ov.manufacturer,
            model_code=ov.model_code or "",
            chassis_no=chassis_no,  # None or str
            color_name=ov.color_name or "",
            color_code=ov.color_code or "",
            engine_type=ov.engine_type or "",

            category=ov.category,
            color=ov.color,
        )

    # 3) この Vehicle に「現所有者」が居たら終了させる（顧客が変わる可能性があるため）
    #    ※同一顧客なら何もしない（重複防止）
    current_links = CustomerVehicle.objects.filter(vehicle=vehicle, owned_to__isnull=True)

    for link in current_links:
        if link.customer_id != order.customer_id:
            link.owned_to = order_date
            link.save(update_fields=["owned_to", "updated_at"])

    # 4) すでにこの顧客がこの車両を現所有しているなら何もしない
    if CustomerVehicle.objects.filter(
        customer=order.customer,
        vehicle=vehicle,
        owned_to__isnull=True,
    ).exists():
        return vehicle

    # 5) CustomerVehicle 作成（現所有）
    CustomerVehicle.objects.create(
        customer=order.customer,
        vehicle=vehicle,
        owned_from=order_date,
        owned_to=None,
    )

    return vehicle
