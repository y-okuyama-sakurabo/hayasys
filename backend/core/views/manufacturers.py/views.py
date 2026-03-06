from rest_framework import generics, permissions
from core.models import Manufacturer, Category
from core.serializers.manufacturers import ManufacturerSerializer


class ManufacturerListView(generics.ListAPIView):
    serializer_class = ManufacturerSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        print("QUERY PARAMS:", self.request.query_params)
        qs = Manufacturer.objects.filter(is_active=True)

        category_id = self.request.query_params.get("category")
        print("DEBUG category_id:", repr(category_id))

        if category_id:
            try:
                category_id = int(category_id)  # 🔥 これ重要
                category = Category.objects.select_related(
                    "manufacturer_group"
                ).get(id=category_id)

                print("DEBUG category:", category.name)
                print("DEBUG group:", category.manufacturer_group_id)

                if category.manufacturer_group:
                    qs = qs.filter(groups=category.manufacturer_group)
                else:
                    qs = qs.none()

            except Exception as e:
                print("DEBUG exception:", e)
                qs = qs.none()

        print("DEBUG final count:", qs.count())
        return qs.order_by("name")
