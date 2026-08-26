from django.contrib import admin
from modeltranslation.admin import TranslationAdmin
from .models import Project, TechStack


@admin.register(TechStack)
class TechStackAdmin(admin.ModelAdmin):
    list_display = ['name', 'order']
    ordering = ['order']


@admin.register(Project)
class ProjectAdmin(TranslationAdmin):
    list_display = ['title', 'client_name', 'ai_type', 'hours_spent', 'start_date', 'order']
    list_filter = ['ai_type']
    filter_horizontal = ['stacks']
    ordering = ['order']
