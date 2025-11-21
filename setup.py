"""
Django LiveView
Real-time server-rendered interfaces for Django using WebSockets

This setup.py is maintained for backwards compatibility with older pip versions.
The canonical build configuration is in pyproject.toml.
"""

from setuptools import setup

# Read the version from pyproject.toml or define it here
__version__ = "2.1.0"

setup(
    name="django-liveview",
    version=__version__,
    description="Real-time server-rendered interfaces for Django using WebSockets",
    long_description=open("README.md").read(),
    long_description_content_type="text/markdown",
    author="Andros Fenollosa",
    author_email="andros@fenollosa.email",
    url="https://github.com/tanrax/django-liveview",
    license="MIT",
    packages=["liveview"],
    include_package_data=True,
    install_requires=[
        "django>=4.2",
        "channels>=4.0.0",
        "channels-redis>=4.0.0",
    ],
    extras_require={
        "dev": [
            "pytest>=7.0.0",
            "pytest-django>=4.5.0",
            "pytest-asyncio>=0.21.0",
            "black>=23.0.0",
            "ruff>=0.1.0",
            "mypy>=1.0.0",
        ],
    },
    python_requires=">=3.10",
    classifiers=[
        "Development Status :: 4 - Beta",
        "Environment :: Web Environment",
        "Framework :: Django",
        "Framework :: Django :: 4.2",
        "Framework :: Django :: 5.0",
        "Framework :: Django :: 5.1",
        "Framework :: Django :: 5.2",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Programming Language :: JavaScript",
        "Topic :: Internet :: WWW/HTTP",
        "Topic :: Internet :: WWW/HTTP :: Dynamic Content",
        "Topic :: Software Development :: Libraries :: Application Frameworks",
        "Topic :: Software Development :: Libraries :: Python Modules",
    ],
    keywords="django liveview websockets realtime stimulus channels",
    project_urls={
        "Homepage": "https://github.com/tanrax/django-liveview",
        "Documentation": "https://github.com/tanrax/django-liveview#readme",
        "Repository": "https://github.com/tanrax/django-liveview",
        "Issues": "https://github.com/tanrax/django-liveview/issues",
    },
)
