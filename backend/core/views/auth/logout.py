from rest_framework.views import APIView
from rest_framework.response import Response

class LogoutView(APIView):
    def post(self, request):
        response = Response({"detail": "logged out"})

        response.delete_cookie("access_token", path="/")
        response.delete_cookie("refresh_token", path="/")

        return response
