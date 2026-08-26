from modeltranslation.translator import register, TranslationOptions
from .models import Project


@register(Project)
class ProjectTranslationOptions(TranslationOptions):
    # Только title и description — client_name остаётся как есть (имя
    # заказчика не переводится), а технические поля (git_url, ai_type
    # и т.д.) вообще не текст.
    fields = ('title', 'description')
