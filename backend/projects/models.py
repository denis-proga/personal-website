from django.core.validators import FileExtensionValidator
from django.db import models
from cloudinary_storage.storage import RawMediaCloudinaryStorage

class TechStack(models.Model):
    name = models.CharField(max_length=100)
    icon = models.FileField(
        upload_to='stacks/',
        blank=True,
        null=True,
        storage=RawMediaCloudinaryStorage(),
        validators=[FileExtensionValidator(allowed_extensions=['svg', 'png', 'jpg', 'jpeg', 'webp'])],
    )
    pdf_file = models.FileField(
        upload_to='pdfs/',
        blank=True,
        null=True,
        storage=RawMediaCloudinaryStorage(),
    )
    order = models.IntegerField(default=0)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['order']


class Project(models.Model):
    AI_CHOICES = [
        ('full_ai', 'Full AI with understanding'),
        ('half_ai', 'Half AI / Half self'),
        ('no_ai', 'Fully self-made'),
    ]

    title = models.CharField(max_length=200)
    description = models.TextField()
    image = models.ImageField(upload_to='projects/')
    git_url = models.URLField(blank=True)
    live_url = models.URLField(blank=True)
    hours_spent = models.FloatField(default=0)
    start_date = models.DateField()
    end_date = models.DateField(blank=True, null=True)
    ai_type = models.CharField(max_length=20, choices=AI_CHOICES)
    client_name = models.CharField(max_length=200, blank=True)
    stacks = models.ManyToManyField(TechStack, blank=True)
    order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

    class Meta:
        ordering = ['order']