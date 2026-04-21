from core.models import Category

def run():
    def apply_recursive(parent, category_type, tax_type):
        children = Category.objects.filter(parent=parent)

        for child in children:
            if category_type and not child.category_type:
                child.category_type = category_type

            if category_type == "expense" and not child.tax_type:
                child.tax_type = tax_type or "taxable"

            child.save()
            apply_recursive(child, category_type, tax_type)

    roots = Category.objects.filter(parent__isnull=True)

    for root in roots:
        apply_recursive(root, root.category_type, root.tax_type)

    print("done")