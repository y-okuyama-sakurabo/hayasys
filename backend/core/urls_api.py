from django.urls import path

# === Auth ===
from core.views.auth.user import AuthUserAPIView, LoginView
from core.views.auth.refresh import CookieTokenRefreshView
from core.views.auth.logout import LogoutView

# === Masters ===
from core.views.masters.customer_classes import CustomerClassListView
from core.views.masters.staffs import StaffListView
from core.views.masters.regions import RegionListView
from core.views.masters.genders import GenderListView
from core.views.masters.shops import ShopListView
from core.views.masters.colors import ColorListView
from core.views.masters.manufacturers import ManufacturerListView
from core.views.masters.vehiclecategories import VehicleCategoryListView
from core.views.masters.registration_locations import RegistrationLocationListView

# === Customers ===
from core.views.customers.views import CustomerListCreateView, CustomerRetrieveUpdateDestroyView
from core.views.customers.images import CustomerImageListCreateView, CustomerImageDeleteView
from core.views.customers.memos import (
    CustomerMemoListCreateView,
    CustomerMemoRetrieveUpdateDestroyView,
)
from core.views.customers.similar import SimilarCustomerAPIView

# === Vehicles (vehicle master) ===
from core.views.vehicles.views import VehicleDetailAPIView, VehicleUpdateAPIView
from core.views.vehicles.images import VehicleImageListCreateView, VehicleImageDeleteView
from core.views.vehicles.memos import VehicleMemoListCreateView, VehicleMemoDeleteView
# ※ 既存Vehicle検索APIを追加するならここに import を足す
# from core.views.vehicles.views import VehicleSearchAPIView

# === Ownerships (CustomerVehicle) ===
from core.views.ownerships.views import (
    CustomerVehicleListCreateAPIView,
    CustomerVehicleRetrieveUpdateDestroyAPIView,  # ← DestroyだけじゃなくUpdateまで持たせたい（後述）
)

# === Schedules ===
from core.views.schedules.views import (
    ScheduleListCreateAPIView,
    ScheduleRetrieveUpdateDestroyAPIView,
    CustomerScheduleListCreateAPIView,
)

# === Business Communication ===
from core.views.business_communication.views import (
    CustomerBusinessCommunicationListCreateAPIView,
    ShopBusinessCommunicationListAPIView,
    BusinessCommunicationStatusUpdateAPIView,
    BusinessCommunicationRetrieveUpdateDestroyAPIView,
)

# === Estimates ===
from core.views.estimates.views import (
    EstimateListCreateAPIView,
    EstimateRetrieveUpdateDestroyAPIView,
    EstimateNextNoAPIView,
)
from core.views.estimates.parties import (
    EstimatePartyListCreateAPIView,
    EstimatePartyRetrieveUpdateDestroyAPIView,
)
from core.views.estimates.items import (
    EstimateItemListCreateAPIView,
    EstimateItemRetrieveUpdateDestroyAPIView,
)
from core.views.products.views import (
    LargeCategoryListAPIView,
    MiddleCategoryListAPIView,
    SmallCategoryListAPIView,
    ProductListAPIView,
)
from core.views.estimates import estimate_vehicle_views as ev

# === Payments ===
from core.views.payments.views import EstimatePaymentListCreateView, PaymentUpdateView

# === Orders ===
from core.views.orders.views import (
    OrderListCreateAPIView,
    OrderRetrieveUpdateDestroyAPIView,
    OrderFromEstimateAPIView,
    PrepareOrderFromEstimateAPIView,
)
from core.views.orders.items import (
    OrderItemListCreateAPIView,
    OrderItemRetrieveUpdateDestroyAPIView,
)
from core.views.orders.mark_sales_view import OrderMarkSalesAPIView

# === Deliveries ===
from core.views.deliveries.views import DeliveryCreateAPIView, DeliveryUpdateAPIView
from core.views.deliveries.delivery_item_cancel import DeliveryItemCancelAPIView

# === Payment Management ===
from core.views.management.management_detail_view import ManagementOrderDetailAPIView
from core.views.payments.payment_management_views import (
    PaymentManagementDetailAPIView,
    PaymentRecordCreateAPIView,
    PaymentRecordDeleteAPIView,
)
from core.views.delivery_payment_list_view import DeliveryPaymentManagementListAPIView
from core.views.sales.views import SalesListCreateAPIView, SalesRetrieveAPIView
from core.views.orders.order_management_list_view import OrderManagementListAPIView
from core.views.management.management_list_view import ManagementOrderListAPIView

# === Audit Logs ===
from core.views.audit_logs.views import AuditLogViewSet

urlpatterns = [
    # ------------------------------------------------------------------
    # 認証
    # ------------------------------------------------------------------
    path("auth/token/", LoginView.as_view(), name="token_obtain_pair"),
    path("auth/refresh/", CookieTokenRefreshView.as_view(), name="token_refresh"),
    path("auth/user/", AuthUserAPIView.as_view(), name="auth-user"),
    path("auth/logout/", LogoutView.as_view(), name="logout"),

    # ------------------------------------------------------------------
    # マスタ
    # ------------------------------------------------------------------
    path("masters/customer_classes/", CustomerClassListView.as_view()),
    path("masters/staffs/", StaffListView.as_view()),
    path("masters/regions/", RegionListView.as_view()),
    path("masters/genders/", GenderListView.as_view()),
    path("masters/shops/", ShopListView.as_view()),
    path("masters/colors/", ColorListView.as_view()),
    path("masters/manufacturers/", ManufacturerListView.as_view()),
    path("masters/vehiclecategories/", VehicleCategoryListView.as_view()),
    path("masters/registration_locations/", RegistrationLocationListView.as_view()),

    # ------------------------------------------------------------------
    # 顧客
    # ------------------------------------------------------------------
    path("customers/", CustomerListCreateView.as_view(), name="customer-list-create"),
    path("customers/<int:pk>/", CustomerRetrieveUpdateDestroyView.as_view(), name="customer-detail"),

    # 顧客画像/メモ
    path("customers/<int:customer_id>/images/", CustomerImageListCreateView.as_view()),
    path("customers/<int:customer_id>/images/<int:pk>/", CustomerImageDeleteView.as_view()),
    path("customers/<int:customer_id>/memos/", CustomerMemoListCreateView.as_view()),
    path("customers/<int:customer_id>/memos/<int:pk>/", CustomerMemoRetrieveUpdateDestroyView.as_view()),

    # 類似顧客
    path("customers/similar/", SimilarCustomerAPIView.as_view(), name="customer-similar"),

    # ------------------------------------------------------------------
    # 顧客所有車両（CustomerVehicle）★ここを一本化
    # ------------------------------------------------------------------
    path(
        "customers/<int:customer_id>/vehicles/",
        CustomerVehicleListCreateAPIView.as_view(),
        name="customer-vehicle-list-create",
    ),
    path(
        "customers/<int:customer_id>/vehicles/<int:customer_vehicle_id>/",
        CustomerVehicleRetrieveUpdateDestroyAPIView.as_view(),
        name="customer-vehicle-rud",
    ),

    # ※互換のため残すなら：旧 current/past API（後で削除）
    # path("customers/<int:customer_id>/vehicles/all/", CustomerVehicleAllListAPIView.as_view()),

    # ------------------------------------------------------------------
    # 車両マスタ（Vehicle）
    # ------------------------------------------------------------------
    path("vehicles/<int:pk>/", VehicleDetailAPIView.as_view(), name="vehicle-detail"),
    path("vehicles/<int:pk>/update/", VehicleUpdateAPIView.as_view(), name="vehicle-update"),
    # path("vehicles/", VehicleSearchAPIView.as_view(), name="vehicle-search"),  # ← 既存選択に必要なら追加

    # Vehicle画像/メモ
    path("vehicles/<int:vehicle_id>/images/", VehicleImageListCreateView.as_view()),
    path("vehicles/<int:vehicle_id>/images/<int:pk>/", VehicleImageDeleteView.as_view()),
    path("customers/<int:customer_id>/memos/", CustomerMemoListCreateView.as_view()),
    path("customers/<int:customer_id>/memos/<int:pk>/", CustomerMemoRetrieveUpdateDestroyView.as_view()),

    # ------------------------------------------------------------------
    # スケジュール
    # ------------------------------------------------------------------
    path("schedules/", ScheduleListCreateAPIView.as_view(), name="schedule-list-create"),
    path("customers/<int:customer_id>/schedules/", CustomerScheduleListCreateAPIView.as_view(), name="customer-schedules"),
    path("schedules/<int:pk>/", ScheduleRetrieveUpdateDestroyAPIView.as_view(), name="schedule-detail"),

    # ------------------------------------------------------------------
    # 業務連絡
    # ------------------------------------------------------------------
    path("customers/<int:customer_id>/business_communications/", CustomerBusinessCommunicationListCreateAPIView.as_view(), name="customer-business-communications"),
    path("business_communications/inbox/", ShopBusinessCommunicationListAPIView.as_view(), name="business-communications-inbox"),
    path("business_communications/<int:pk>/status/", BusinessCommunicationStatusUpdateAPIView.as_view(), name="business-communications-status-update"),
    path("business_communications/<int:pk>/", BusinessCommunicationRetrieveUpdateDestroyAPIView.as_view(), name="business-communications-rud"),

    # ------------------------------------------------------------------
    # 見積
    # ------------------------------------------------------------------
    path("estimates/", EstimateListCreateAPIView.as_view(), name="estimate-list-create"),
    path("estimates/<int:pk>/", EstimateRetrieveUpdateDestroyAPIView.as_view(), name="estimate-detail"),
    path("estimates/next-no/", EstimateNextNoAPIView.as_view(), name="estimate-next-no"),

    path("estimate_parties/", EstimatePartyListCreateAPIView.as_view(), name="estimate-party-list-create"),
    path("estimate_parties/<int:pk>/", EstimatePartyRetrieveUpdateDestroyAPIView.as_view(), name="estimate-party-detail"),

    path("estimates/<int:estimate_id>/items/", EstimateItemListCreateAPIView.as_view(), name="estimate-item-list-create"),
    path("estimates/<int:estimate_id>/items/<int:pk>/", EstimateItemRetrieveUpdateDestroyAPIView.as_view(), name="estimate-item-detail"),

    path("estimates/<int:estimate_id>/vehicles/", ev.EstimateVehicleListCreateAPIView.as_view(), name="estimate-vehicle-list"),
    path("estimates/<int:estimate_id>/vehicles/<int:pk>/", ev.EstimateVehicleRetrieveUpdateDestroyAPIView.as_view(), name="estimate-vehicle-detail"),

    path("categories/large/", LargeCategoryListAPIView.as_view(), name="category-large-list"),
    path("categories/middle/", MiddleCategoryListAPIView.as_view(), name="category-middle-list"),
    path("categories/small/", SmallCategoryListAPIView.as_view(), name="category-small-list"),
    path("products/", ProductListAPIView.as_view(), name="product-list"),

    # ------------------------------------------------------------------
    # 支払い（見積単位）
    # ------------------------------------------------------------------
    path("estimates/<int:estimate_id>/payments/", EstimatePaymentListCreateView.as_view(), name="estimate-payments"),
    path("payments/<int:pk>/", PaymentUpdateView.as_view(), name="payment-update"),

    # ------------------------------------------------------------------
    # 受注
    # ------------------------------------------------------------------
    path("orders/", OrderListCreateAPIView.as_view(), name="order-list-create"),
    path("orders/<int:pk>/", OrderRetrieveUpdateDestroyAPIView.as_view(), name="order-detail"),
    path("orders/from-estimate/", OrderFromEstimateAPIView.as_view(), name="order-from-estimate"),
    path("orders/prepare-from-estimate/", PrepareOrderFromEstimateAPIView.as_view(), name="order-prepare-from-estimate"),

    path("orders/<int:order_id>/items/", OrderItemListCreateAPIView.as_view(), name="order-item-list-create"),
    path("order-items/<int:pk>/", OrderItemRetrieveUpdateDestroyAPIView.as_view(), name="order-item-detail"),

    # ✅ mark-sales は pk で統一（重複削除）
    path("orders/<int:pk>/mark-sales/", OrderMarkSalesAPIView.as_view()),

    # ------------------------------------------------------------------
    # 納品
    # ------------------------------------------------------------------
    path("deliveries/", DeliveryCreateAPIView.as_view(), name="delivery-create"),
    path("deliveries/<int:pk>/", DeliveryUpdateAPIView.as_view(), name="delivery-update"),
    path("deliveries/cancel-item/", DeliveryItemCancelAPIView.as_view()),

    # ------------------------------------------------------------------
    # 入金管理・売上・管理一覧
    # ------------------------------------------------------------------
    path("management/payments/<int:order_id>/", PaymentManagementDetailAPIView.as_view()),
    path("management/payments/<int:order_id>/records/", PaymentRecordCreateAPIView.as_view()),
    path("payment-records/<int:pk>/", PaymentRecordDeleteAPIView.as_view()),

    path("delivery-payment-management/", DeliveryPaymentManagementListAPIView.as_view(), name="delivery-payment-management-list"),

    path("sales/", SalesListCreateAPIView.as_view(), name="sales-list-create"),
    path("sales/<int:pk>/", SalesRetrieveAPIView.as_view(), name="sales-detail"),

    path("order-management/", OrderManagementListAPIView.as_view()),
    path("management/orders/<int:order_id>/", ManagementOrderDetailAPIView.as_view()),
    path("management/orders/", ManagementOrderListAPIView.as_view()),

        # ------------------------------------------------------------------
    # 操作ログ（監査ログ）
    # ------------------------------------------------------------------
    path(
        "audit-logs/",
        AuditLogViewSet.as_view({"get": "list"}),
        name="audit-log-list",
    ),
]
