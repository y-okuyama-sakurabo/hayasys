from datetime import date
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from core.models.document_templates import DocumentTemplate, DocumentField, SOURCE_KEY_CHOICES
from core.models.customers import Customer
from core.models.vehicles import Vehicle, VehicleRegistration
from core.models.base import CompanySettings
from core.serializers.document_templates import DocumentTemplateSerializer, DocumentFieldSerializer


# ── テンプレート CRUD ──────────────────────────────────────────────

class DocumentTemplateListCreateView(generics.ListCreateAPIView):
    queryset = DocumentTemplate.objects.all()
    serializer_class = DocumentTemplateSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.query_params.get("active_only"):
            qs = qs.filter(is_active=True)
        return qs


class DocumentTemplateDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = DocumentTemplate.objects.all()
    serializer_class = DocumentTemplateSerializer
    permission_classes = [IsAuthenticated]


# ── フィールド CRUD ───────────────────────────────────────────────

class DocumentFieldListCreateView(generics.ListCreateAPIView):
    serializer_class = DocumentFieldSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return DocumentField.objects.filter(template_id=self.kwargs["template_id"])

    def perform_create(self, serializer):
        template = DocumentTemplate.objects.get(pk=self.kwargs["template_id"])
        serializer.save(template=template)


class DocumentFieldDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = DocumentField.objects.all()
    serializer_class = DocumentFieldSerializer
    permission_classes = [IsAuthenticated]


# ── 選択肢一覧 ────────────────────────────────────────────────────

class DocumentSourceKeyChoicesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response([{"key": k, "label": v} for k, v in SOURCE_KEY_CHOICES])


# ── 印刷データ生成 ────────────────────────────────────────────────

def _wareki(d: date) -> str:
    y = d.year
    if y >= 2019:
        return f"令和{y - 2018}年{d.month}月{d.day}日"
    if y >= 1989:
        return f"平成{y - 1988}年{d.month}月{d.day}日"
    return d.strftime("%Y/%m/%d")


class DocumentRenderView(APIView):
    """
    POST /api/document-templates/<id>/render/
    {
        "customer_id": 1,
        "vehicle_id": 2,
        "inputs": {"手入力ラベル名": "値", ...}
    }
    → フィールドごとに解決済みの value を返す
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        template = DocumentTemplate.objects.prefetch_related("fields").get(pk=pk)
        customer_id = request.data.get("customer_id")
        vehicle_id = request.data.get("vehicle_id")
        inputs = request.data.get("inputs", {})

        # データ取得
        customer = Customer.objects.get(pk=customer_id) if customer_id else None
        vehicle = None
        registration = None
        if vehicle_id:
            vehicle = Vehicle.objects.select_related("manufacturer", "color").get(pk=vehicle_id)
            registration = (
                VehicleRegistration.objects.filter(vehicle=vehicle)
                .order_by("-id")
                .first()
            )

        company = CompanySettings.get()
        today = date.today()

        def resolve(field: DocumentField) -> str:
            k = field.source_key
            if k == "static":
                return field.static_value or ""
            if k == "input":
                return inputs.get(field.input_label or field.label, "")
            if k == "date_today":
                return today.strftime("%Y/%m/%d")
            if k == "date_wareki":
                return _wareki(today)

            # customer.*
            if k.startswith("customer.") and customer:
                attr = k[len("customer."):]
                val = getattr(customer, attr, None)
                return str(val) if val is not None else ""

            # vehicle.*
            if k.startswith("vehicle.") and vehicle:
                attr = k[len("vehicle."):]
                val = getattr(vehicle, attr, None)
                if val is None and attr == "vehicle_name":
                    val = getattr(vehicle, "vehicle_name", None)
                return str(val) if val is not None else ""

            # registration.*
            if k.startswith("registration.") and registration:
                attr = k[len("registration."):]
                val = getattr(registration, attr, None)
                return str(val) if val is not None else ""

            # company.*
            if k.startswith("company."):
                attr = k[len("company."):]
                # CompanySettings の属性、なければ Shop 情報
                val = getattr(company, attr, None)
                return str(val) if val is not None else ""

            return ""

        result = []
        for f in template.fields.all():
            result.append({
                "id": f.id,
                "label": f.label,
                "source_key": f.source_key,
                "input_label": f.input_label,
                "value": resolve(f),
                "x": f.x,
                "y": f.y,
                "font_size": f.font_size,
                "letter_spacing": f.letter_spacing,
            })

        return Response({
            "template": {
                "id": template.id,
                "name": template.name,
                "paper_width": template.paper_width,
                "paper_height": template.paper_height,
            },
            "fields": result,
        })
