"""
Sasl - Social Asynchronous Sharing Layer
Custom utilities.
"""
from rest_framework.views import exception_handler

def custom_exception_handler(exc, context):
    """
    A simple wrapper around the default DRF exception handler.
    You can add custom logging or response formatting here later.
    """
    response = exception_handler(exc, context)
    return response