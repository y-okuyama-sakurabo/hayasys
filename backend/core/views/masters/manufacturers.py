from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from core.models import Manufacturer, Category
from core.serializers.masters import ManufacturerSerializer


class ManufacturerListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Manufacturer.objects.filter(is_active=True)

        category_id = request.query_params.get("category")

        if category_id:
            try:
                category = Category.objects.select_related(
                    "manufacturer_group"
                ).get(id=int(category_id))

                if category.manufacturer_group_id:
                    qs = qs.filter(
                        groups__id=category.manufacturer_group_id
                    )
                else:
                    qs = qs.none()

            except Category.DoesNotExist:
                qs = qs.none()

        qs = qs.order_by("name")

        return Response(
            ManufacturerSerializer(qs, many=True).data
        )