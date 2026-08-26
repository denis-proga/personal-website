from rest_framework import serializers
from .models import Project, TechStack


class TechStackSerializer(serializers.ModelSerializer):
    class Meta:
        model = TechStack
        fields = ['id', 'name', 'icon', 'pdf_file', 'order']


class ProjectSerializer(serializers.ModelSerializer):
    stacks = TechStackSerializer(many=True, read_only=True)

    class Meta:
        model = Project
        fields = [
            'id',
            # По языковой версии на каждое переводимое поле — теневые
            # колонки от django-modeltranslation. Фронт сам выбирает нужную
            # при рендере, без повторного запроса при смене языка сайта.
            'title_ru', 'title_uk', 'title_en', 'title_es', 'title_de',
            'description_ru', 'description_uk', 'description_en',
            'description_es', 'description_de',
            'image',
            'git_url', 'live_url', 'hours_spent',
            'start_date', 'end_date', 'ai_type',
            'client_name', 'stacks', 'order',
            'created_at',
        ]
