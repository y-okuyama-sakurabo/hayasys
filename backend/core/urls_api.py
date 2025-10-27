# core/urls_api.py
from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from core.views.masters.customer_classes import CustomerClassListView
from core.views.masters.staffs import StaffListView
from core.views.masters.regions import RegionListView
from core.views.masters.genders import GenderListView
from core.views.masters.shops import ShopListView
from core.views.masters.colors import ColorListView
from core.views.masters.manufacturers import ManufacturerListView
from core.views.masters.vehiclecategories import VehicleCategoryListView
from core.views.masters.registration_locations import RegistrationLocationListView
from core.views.business_communication.views import CustomerBusinessCommunicationListCreateAPIView, ShopBusinessCommunicationListAPIView, BusinessCommunicationStatusUpdateAPIView



from core.views.customers.views import (
    CustomerListCreateView,
    CustomerRetrieveUpdateDestroyView,
)
from core.views.customers.images import CustomerImageListCreateView, CustomerImageDeleteView
from core.views.customers.memos import CustomerMemoListCreateView, CustomerMemoDeleteView

from core.views.vehicles.views import VehicleDetailAPIView, VehicleUpdateAPIView, CustomerVehicleAllListAPIView, CustomerVehicleReleaseAPIView, CustomerVehicleSearchAPIView
from core.views.vehicles.images import VehicleImageListCreateView, VehicleImageDeleteView
from core.views.vehicles.memos import VehicleMemoListCreateView, VehicleMemoDeleteView

# 所有車両(Ownership)
from core.views.ownerships.views import (
    CustomerVehicleListCreateAPIView,
    CustomerVehicleRetrieveDestroyAPIView,
)

from core.views.schedules.views import (
    ScheduleListCreateAPIView,
    ScheduleRetrieveUpdateDestroyAPIView,
    CustomerScheduleListCreateAPIView,
)

from core.views.estimates.views import (
    EstimateListCreateAPIView,
    EstimateRetrieveUpdateDestroyAPIView,
)

from core.views.estimates.parties import EstimatePartyListCreateAPIView, EstimatePartyRetrieveUpdateDestroyAPIView



urlpatterns = [
    # --- 認証 ---
    path("auth/token/", TokenObtainPairView.as_view()),
    path("auth/refresh/", TokenRefreshView.as_view()),

    # --- masters ---
    path("masters/customer_classes/", CustomerClassListView.as_view()),
    path("masters/staffs/", StaffListView.as_view()),
    path("masters/regions/", RegionListView.as_view()),
    path("masters/genders/", GenderListView.as_view()),
    path("masters/shops/", ShopListView.as_view()),
    path("masters/colors/", ColorListView.as_view()),
    path("masters/manufacturers/", ManufacturerListView.as_view()),
    path("masters/vehiclecategories/", VehicleCategoryListView.as_view()),
    path("masters/registration_locations/", RegistrationLocationListView.as_view()),

    # --- customers ---
    path("customers/", CustomerListCreateView.as_view(), name="customer-list-create"),  
    path("customers/<int:pk>/", CustomerRetrieveUpdateDestroyView.as_view(), name="customer-detail"),
    path("customers/<int:customer_id>/vehicles/all/", CustomerVehicleAllListAPIView.as_view()),
    path("customers/<int:customer_id>/images/", CustomerImageListCreateView.as_view()),  
    path("customers/<int:customer_id>/images/<int:pk>/", CustomerImageDeleteView.as_view()),
    path("customers/<int:customer_id>/memos/", CustomerMemoListCreateView.as_view()),  
    path("customers/<int:customer_id>/memos/<int:pk>/", CustomerMemoDeleteView.as_view()),
    path("customers/<int:customer_id>/vehicles/", CustomerVehicleListCreateAPIView.as_view(),
         name="customer-vehicle-list-create"),
    path("customers/<int:customer_id>/vehicles/<int:id>/", CustomerVehicleRetrieveDestroyAPIView.as_view(),
         name="customer-vehicle-detail-destroy"),
    

    # vehicles
    path("vehicles/<int:vehicle_id>/images/", VehicleImageListCreateView.as_view()),  
    path("vehicles/<int:vehicle_id>/images/<int:pk>/", VehicleImageDeleteView.as_view()),
    path("vehicles/<int:vehicle_id>/memos/", VehicleMemoListCreateView.as_view()),
    path("vehicles/<int:vehicle_id>/memos/<int:pk>/", VehicleMemoDeleteView.as_view()),
    path("vehicles/<int:pk>/", VehicleDetailAPIView.as_view(), name="vehicle-detail"),
    path("vehicles/<int:pk>/update/", VehicleUpdateAPIView.as_view(), name="vehicle-update"),

    # schedules
    # トップページ用（一覧＋追加）
    path("schedules/", ScheduleListCreateAPIView.as_view(), name="schedule_list_create"),
    # 顧客別スケジュール（一覧＋追加）
    path("customers/<int:customer_id>/schedules/", CustomerScheduleListCreateAPIView.as_view(), name="customer_schedules"),
    # 単体詳細
    path("schedules/<int:pk>/", ScheduleRetrieveUpdateDestroyAPIView.as_view(), name="schedule_detail"),

    # 業務連絡
    # 顧客詳細ページ用
    path(
        "customers/<int:customer_id>/business_communications/",
        CustomerBusinessCommunicationListCreateAPIView.as_view(),
        name="customer-business-communications",
    ),
    # ダッシュボード用（自店舗宛）
    path(
        "business_communications/inbox/",
        ShopBusinessCommunicationListAPIView.as_view(),
        name="business-communications-inbox",
    ),
    # ステータス更新
    path(
        "business_communications/<int:pk>/status/",
        BusinessCommunicationStatusUpdateAPIView.as_view(),
        name="business-communications-status-update",
    ),

    # 見積
    path("estimates/", EstimateListCreateAPIView.as_view(), name="estimate-list-create"),
    path("estimates/<int:pk>/", EstimateRetrieveUpdateDestroyAPIView.as_view(), name="estimate-detail"),

    # 顧客スナップショット
    path("estimate_parties/", EstimatePartyListCreateAPIView.as_view(), name="estimate-party-list-create"),
    path("estimate_parties/<int:pk>/", EstimatePartyRetrieveUpdateDestroyAPIView.as_view(), name="estimate-party-detail"),
]
