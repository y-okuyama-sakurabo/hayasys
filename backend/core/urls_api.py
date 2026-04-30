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
from core.views.masters.unit import UnitListAPIView

# === Dashboard ===
from core.views.dashboard.views import DashboardAPIView

# === Customers ===
from core.views.customers.views import (
    CustomerListCreateView,
    CustomerRetrieveUpdateDestroyView,
    CustomerCSVExportAPIView,
)
from core.views.customers.images import (
    CustomerImageListCreateView,
    CustomerImageDeleteView,
)
from core.views.customers.memos import (
    CustomerMemoListCreateView,
    CustomerMemoRetrieveUpdateDestroyView,
)
from core.views.customers.similar import SimilarCustomerAPIView

# === Vehicles (vehicle master) ===
from core.views.vehicles.views import (
    VehicleDetailAPIView,
    VehicleUpdateAPIView,
    VehicleDuplicateCheckAPIView
)
from core.views.vehicles.images import (
    VehicleImageListCreateView,
    VehicleImageDeleteView,
)
from core.views.vehicles.memos import (
    VehicleMemoListCreateView,
    VehicleMemoRetrieveUpdateDestroyView,
)

# === Vehicle related (registration/insurance/warranty) ===
from core.views.vehicles.registrations import (
    VehicleRegistrationListCreateView,
    VehicleRegistrationRetrieveUpdateDestroyView,
)
from core.views.vehicles.insurances import (
    VehicleInsuranceListCreateView,
    VehicleInsuranceRetrieveUpdateDestroyView,
)
from core.views.vehicles.warranties import (
    VehicleWarrantyListCreateView,
    VehicleWarrantyRetrieveUpdateDestroyView,
)

# === Ownerships ===
from core.views.ownerships.views import (
    CustomerVehicleListCreateAPIView,
    CustomerVehicleRetrieveUpdateDestroyAPIView,
)

# === Schedules ===
from core.views.schedules.views import (
    ScheduleListCreateAPIView,
    ScheduleRetrieveUpdateDestroyAPIView,
    CustomerScheduleListCreateAPIView,
)

# === Business Communication ===
from core.views.business_communication.views import (
    BusinessCommunicationRetrieveUpdateDestroyAPIView,
    CustomerBusinessCommunicationThreadListCreateAPIView,
    BusinessCommunicationMessageListCreateAPIView,
    BusinessCommunicationThreadRetrieveDestroyAPIView,
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
from core.views.estimates import estimate_vehicle_views as ev

# === Categories / Products ===
from core.views.categories.views import (
    CategoryListAPIView,
    CategoryRetrieveAPIView,
    CategoryTreeAPIView,
    ProductListAPIView,
    ProductSearchAPIView,
    LeafCategoryListAPIView,  # ← 追加
)

# === Payments ===
from core.views.payments.views import (
    EstimatePaymentListCreateView,
    PaymentUpdateView,
)

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
from core.views.deliveries.views import (
    DeliveryCreateAPIView,
    DeliveryUpdateAPIView,
)
from core.views.deliveries.delivery_item_cancel import (
    DeliveryItemCancelAPIView,
)

# === Payment Management ===
from core.views.management.management_detail_view import (
    ManagementOrderDetailAPIView,
    ManagementMonthlySummaryAPIView
)
from core.views.payments.payment_management_views import (
    PaymentManagementDetailAPIView,
    PaymentRecordCreateAPIView,
    PaymentRecordDeleteAPIView,
)
from core.views.delivery_payment_list_view import (
    DeliveryPaymentManagementListAPIView,
)
from core.views.sales.views import (
    SalesListCreateAPIView,
    SalesRetrieveAPIView,
)
from core.views.orders.order_management_list_view import (
    OrderManagementListAPIView,
)
from core.views.management.management_list_view import (
    ManagementOrderListAPIView,
)

# === Audit Logs ===
from core.views.audit_logs.views import AuditLogViewSet

# === Analytics ===
from core.views.analytics.views import (
    SalesDailyAPIView,
    SalesListAPIView,
    ProductAnalyticsAPIView,
)

urlpatterns = [

    # =========================
    # Auth
    # =========================
    path("auth/token/", LoginView.as_view()),
    path("auth/refresh/", CookieTokenRefreshView.as_view()),
    path("auth/user/", AuthUserAPIView.as_view()),
    path("auth/logout/", LogoutView.as_view()),

    # =========================
    # Masters
    # =========================
    path("masters/customer_classes/", CustomerClassListView.as_view()),
    path("masters/staffs/", StaffListView.as_view()),
    path("masters/regions/", RegionListView.as_view()),
    path("masters/genders/", GenderListView.as_view()),
    path("masters/shops/", ShopListView.as_view()),
    path("masters/colors/", ColorListView.as_view()),
    path("masters/manufacturers/", ManufacturerListView.as_view()),
    path("masters/vehiclecategories/", VehicleCategoryListView.as_view()),
    path("masters/registration_locations/", RegistrationLocationListView.as_view()),
    path("masters/units/", UnitListAPIView.as_view()),

    # =========================
    # Dashboard
    # =========================
    path("dashboard/", DashboardAPIView.as_view()),

    # =========================
    # Customers
    # =========================
    path("customers/", CustomerListCreateView.as_view()),
    path("customers/<int:pk>/", CustomerRetrieveUpdateDestroyView.as_view()),
    path("customers/<int:customer_id>/images/", CustomerImageListCreateView.as_view()),
    path("customers/<int:customer_id>/images/<int:pk>/", CustomerImageDeleteView.as_view()),
    path("customers/<int:customer_id>/memos/", CustomerMemoListCreateView.as_view()),
    path("customers/<int:customer_id>/memos/<int:pk>/", CustomerMemoRetrieveUpdateDestroyView.as_view()),
    path("customers/similar/", SimilarCustomerAPIView.as_view()),
    path(
        "customers/export-csv/",
        CustomerCSVExportAPIView.as_view(),
        name="customers-export-csv",
    ),
    # =========================
    # Customer Vehicles
    # =========================
    path("customers/<int:customer_id>/vehicles/", CustomerVehicleListCreateAPIView.as_view()),
    path("customers/<int:customer_id>/vehicles/<int:customer_vehicle_id>/", CustomerVehicleRetrieveUpdateDestroyAPIView.as_view()),

    # =========================
    # Vehicle Master
    # =========================
    path("vehicles/<int:pk>/", VehicleDetailAPIView.as_view()),
    path("vehicles/<int:pk>/update/", VehicleUpdateAPIView.as_view()),
    path("vehicles/<int:vehicle_id>/images/", VehicleImageListCreateView.as_view()),
    path("vehicles/<int:vehicle_id>/images/<int:pk>/", VehicleImageDeleteView.as_view()),
    path("vehicles/<int:vehicle_id>/memos/", VehicleMemoListCreateView.as_view()),
    path("vehicles/<int:vehicle_id>/memos/<int:pk>/", VehicleMemoRetrieveUpdateDestroyView.as_view()),
    path("vehicles/<int:vehicle_id>/registrations/", VehicleRegistrationListCreateView.as_view()),
    path("vehicles/<int:vehicle_id>/registrations/<int:pk>/", VehicleRegistrationRetrieveUpdateDestroyView.as_view()),

    path("vehicles/<int:vehicle_id>/insurances/", VehicleInsuranceListCreateView.as_view()),
    path("vehicles/<int:vehicle_id>/insurances/<int:pk>/", VehicleInsuranceRetrieveUpdateDestroyView.as_view()),

    path("vehicles/<int:vehicle_id>/warranties/", VehicleWarrantyListCreateView.as_view()),
    path("vehicles/<int:vehicle_id>/warranties/<int:pk>/", VehicleWarrantyRetrieveUpdateDestroyView.as_view()),

    path("vehicles/check-duplicate/", VehicleDuplicateCheckAPIView.as_view()),

    # =========================
    # Categories & Products
    # =========================
    path("categories/", CategoryListAPIView.as_view()),
    path("categories/leaf/", LeafCategoryListAPIView.as_view()),  # ←追加
    path("categories/<int:pk>/", CategoryRetrieveAPIView.as_view()),
    path("categories/tree/", CategoryTreeAPIView.as_view()),
    path("products/", ProductListAPIView.as_view()),
    path("products/search/", ProductSearchAPIView.as_view()),

    # =========================
    # Estimates
    # =========================
    path("estimates/", EstimateListCreateAPIView.as_view()),
    path("estimates/<int:pk>/", EstimateRetrieveUpdateDestroyAPIView.as_view()),
    path("estimates/next-no/", EstimateNextNoAPIView.as_view()),
    path("estimate_parties/", EstimatePartyListCreateAPIView.as_view()),
    path("estimate_parties/<int:pk>/", EstimatePartyRetrieveUpdateDestroyAPIView.as_view()),
    path("estimates/<int:estimate_id>/items/", EstimateItemListCreateAPIView.as_view()),
    path("estimates/<int:estimate_id>/items/<int:pk>/", EstimateItemRetrieveUpdateDestroyAPIView.as_view()),
    path("estimates/<int:estimate_id>/vehicles/", ev.EstimateVehicleListCreateAPIView.as_view()),
    path("estimates/<int:estimate_id>/vehicles/<int:pk>/", ev.EstimateVehicleRetrieveUpdateDestroyAPIView.as_view()),

    # =========================
    # Orders
    # =========================
    path("orders/", OrderListCreateAPIView.as_view()),
    path("orders/<int:pk>/", OrderRetrieveUpdateDestroyAPIView.as_view()),
    path("orders/from-estimate/", OrderFromEstimateAPIView.as_view()),
    path("orders/prepare-from-estimate/", PrepareOrderFromEstimateAPIView.as_view()),
    path("orders/<int:order_id>/items/", OrderItemListCreateAPIView.as_view()),
    path("order-items/<int:pk>/", OrderItemRetrieveUpdateDestroyAPIView.as_view()),
    path("orders/<int:pk>/mark-sales/", OrderMarkSalesAPIView.as_view()),

    # =========================
    # Deliveries
    # =========================
    path("deliveries/", DeliveryCreateAPIView.as_view()),
    path("deliveries/<int:pk>/", DeliveryUpdateAPIView.as_view()),
    path("deliveries/cancel-item/", DeliveryItemCancelAPIView.as_view()),

    # =========================
    # Analytics
    # =========================
    path("analytics/sales-daily/", SalesDailyAPIView.as_view()),
    path("analytics/sales-list/", SalesListAPIView.as_view()),
    path("analytics/product/", ProductAnalyticsAPIView.as_view()),


    # =========================
    # Management（納品・入金管理）
    # =========================
    path(
        "management/orders/",
        ManagementOrderListAPIView.as_view(),
    ),
    path(
        "management/orders/<int:order_id>/",
        ManagementOrderDetailAPIView.as_view(),
    ),

    path(
        "management/orders/monthly/",
        ManagementMonthlySummaryAPIView.as_view(),
    ),

    # Payment management
    path(
        "management/payments/<int:order_id>/records/",
        PaymentRecordCreateAPIView.as_view(),
    ),
    path(
        "payment-records/<int:pk>/",
        PaymentRecordDeleteAPIView.as_view(),
    ),
    # =========================
    # Schedules
    # =========================
    path("schedules/", ScheduleListCreateAPIView.as_view()),
    path("schedules/<int:pk>/", ScheduleRetrieveUpdateDestroyAPIView.as_view()),
    path(
        "customers/<int:customer_id>/schedules/",
        CustomerScheduleListCreateAPIView.as_view(),
    ),

    # =========================
    # Business Communication
    # =========================
    path(
    "customers/<int:customer_id>/communication-threads/",
    CustomerBusinessCommunicationThreadListCreateAPIView.as_view(),
    ),

    path(
    "communication-threads/<int:thread_id>/messages/",
        BusinessCommunicationMessageListCreateAPIView.as_view(),
    ), 

    path(
        "business-communications/<int:pk>/",
        BusinessCommunicationRetrieveUpdateDestroyAPIView.as_view(),
    ),

    path(
        "communication-threads/<int:pk>/",
        BusinessCommunicationThreadRetrieveDestroyAPIView.as_view(),
    ),
                
]
