import importlib
import logging
import os
import sys
from pathlib import Path

from django.apps import AppConfig, apps
from django.conf import settings

logger = logging.getLogger(__name__)


class LiveViewConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "liveview"
    verbose_name = "Django LiveView"

    def ready(self):
        """
        Import all liveview components when app is ready.
        """
        # Only import in the main Django process (not in commands or reloader)
        if self._should_import_components():
            self.import_liveview_components()

    def _should_import_components(self):
        """
        Determine if we should import components based on the current process.
        """
        # Don't import during management commands
        if any(
            cmd in sys.argv
            for cmd in ["migrate", "makemigrations", "collectstatic", "compilemessages"]
        ):
            return False

        # Skip the reloader process (only for runserver)
        run_main = os.environ.get("RUN_MAIN")
        return run_main is None or run_main == "true"

    def import_liveview_components(self):
        """
        Auto-discover and import all liveview components from Django apps.
        """
        for app_config in apps.get_app_configs():
            components_dir = Path(app_config.path) / "liveview_components"

            if not components_dir.exists():
                continue

            # Get app module name
            app_module = app_config.module.__name__

            # Import all Python files in liveview_components
            for file in components_dir.glob("*.py"):
                if file.name.startswith("_"):
                    continue

                module_name = file.stem
                full_module_path = f"{app_module}.liveview_components.{module_name}"

                try:
                    # Reload in debug mode, import otherwise
                    if settings.DEBUG and full_module_path in sys.modules:
                        importlib.reload(sys.modules[full_module_path])
                        print(f"🔄 Reloaded: {full_module_path}")
                    else:
                        importlib.import_module(full_module_path)
                        print(f"✓ Imported: {full_module_path}")
                except Exception:
                    logger.exception("✗ Error importing %s", full_module_path)
