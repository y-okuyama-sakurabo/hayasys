# core/views/vehicles/views.py
from django.db.models import Prefetch
from rest_framework import generics, status
from rest_framework.response import Response

from core.models import Vehicle, CustomerVehicle, Customer
from core.serializers.vehicles import (
    VehicleWriteSerializer,
    VehicleDetailSerializer,
    VehicleListSerializer,
)
from core.models import (
    CustomerVehicle,
    VehicleRegistration,
    VehicleInsurance,
    VehicleWarranty,
    VehicleMemo,
)
from core.serializers.ownerships import CustomerVehicleSerializer
from core.serializers.vehicles import VehicleDetailSerializer


# 顧客ごとの車両一覧・登録
class CustomerVehicleListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = VehicleWriteSerializer

    def get_queryset(self):
        customer_id = self.kwargs["customer_id"]
        # Vehicle ↔ CustomerVehicle の関連名に注意
        return Vehicle.objects.filter(customer_vehicles__customer_id=customer_id)

    def create(self, request, *args, **kwargs):
        customer_id = self.kwargs["customer_id"]
        customer = Customer.objects.get(pk=customer_id)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        vehicle = serializer.save()

        # 中間テーブルへ登録
        CustomerVehicle.objects.create(customer=customer, vehicle=vehicle)

        return Response(serializer.data, status=status.HTTP_201_CREATED)


# 顧客車両の削除
class CustomerVehicleDestroyAPIView(generics.DestroyAPIView):
    queryset = CustomerVehicle.objects.all()
    serializer_class = CustomerVehicleSerializer
    lookup_field = "id"


# 単体車両詳細
class VehicleDetailAPIView(generics.RetrieveAPIView):
    queryset = Vehicle.objects.all()
    serializer_class = VehicleDetailSerializer

# 編集
class VehicleUpdateAPIView(generics.UpdateAPIView):
    queryset = Vehicle.objects.all()
    serializer_class = VehicleWriteSerializer

# 顧客の現所有＋過去所有車両一覧
class CustomerVehicleAllListAPIView(generics.GenericAPIView):
    serializer_class = VehicleDetailSerializer

    def get(self, request, *args, **kwargs):
        customer_id = self.kwargs["customer_id"]

        # 共通プリフェッチ設定（関連テーブルを事前ロード）
        related_prefetch = [
            Prefetch("vehicle__registrations", queryset=VehicleRegistration.objects.all()),
            Prefetch("vehicle__insurances", queryset=VehicleInsurance.objects.all()),
            Prefetch("vehicle__warranties", queryset=VehicleWarranty.objects.all()),
            Prefetch("vehicle__memos", queryset=VehicleMemo.objects.all()),
            "vehicle__customer_vehicles",  # owners
        ]

        # 現在所有（owned_to が NULL）
        current_vehicles = (
            CustomerVehicle.objects.filter(customer_id=customer_id, owned_to__isnull=True)
            .select_related(
                "vehicle",
                "vehicle__manufacturer",
                "vehicle__category",
                "vehicle__color",
            )
            .prefetch_related(*related_prefetch)
        )

        # 過去所有（owned_to に日付あり）
        past_vehicles = (
            CustomerVehicle.objects.filter(customer_id=customer_id, owned_to__isnull=False)
            .select_related(
                "vehicle",
                "vehicle__manufacturer",
                "vehicle__category",
                "vehicle__color",
            )
            .prefetch_related(*related_prefetch)
        )

        # 各 Vehicle をシリアライザで展開
        current_data = VehicleDetailSerializer(
            [cv.vehicle for cv in current_vehicles], many=True
        ).data
        past_data = VehicleDetailSerializer(
            [cv.vehicle for cv in past_vehicles], many=True
        ).data

        return Response(
            {"current": current_data, "past": past_data},
            status=status.HTTP_200_OK,
        )

from datetime import date

# 手放す（owned_to を当日で更新）
class CustomerVehicleReleaseAPIView(generics.UpdateAPIView):
    queryset = CustomerVehicle.objects.all()
    serializer_class = CustomerVehicleSerializer
    lookup_field = "id"

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        # すでに手放し済みならエラー
        if instance.owned_to is not None:
            return Response({"detail": "すでに手放されています。"}, status=status.HTTP_400_BAD_REQUEST)

        instance.owned_to = date.today()
        instance.save(update_fields=["owned_to"])

        return Response(
            {"message": "手放し処理が完了しました", "owned_to": instance.owned_to},
            status=status.HTTP_200_OK,
        )

class CustomerVehicleSearchAPIView(generics.GenericAPIView):
    serializer_class = VehicleDetailSerializer

    def get(self, request, *args, **kwargs):
        customer_id = self.kwargs["customer_id"]
        q = request.query_params.get("q", "").strip()

        if not q:
            return Response(
                {"detail": "検索ワードを指定してください。"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 顧客の所有車両を取得（現所有＋過去所有）
        customer_vehicles = CustomerVehicle.objects.filter(
            customer_id=customer_id,
            vehicle__chassis_no__icontains=q,  # 車台番号部分一致
        ).select_related(
            "vehicle",
            "vehicle__manufacturer",
            "vehicle__category",
            "vehicle__color",
        ).prefetch_related(
            Prefetch("vehicle__registrations", queryset=VehicleRegistration.objects.all()),
            "vehicle__insurances",
            "vehicle__warranties",
            "vehicle__memos",
            "vehicle__customer_vehicles",  # 所有履歴（owners）
        )

        vehicles = [cv.vehicle for cv in customer_vehicles]

        serializer = self.get_serializer(vehicles, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)