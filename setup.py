from setuptools import setup

setup(
    name="django-liveview",
    py_modules=["liveview"],
    version="VERSION",
    python_requires=">3.7",
    description="Framework for creating Realtime SPAs using HTML over the Wire technology in Django",
    author="Andros Fenollosa",
    author_email="andros@fenollosa.email",
    url="https://github.com/Django-LiveView/liveview",
    keywords=["django", "ssr", "channels", "liveview", "html-over-the-wire", "hotwire"],
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: GNU General Public License v3 or later (GPLv3+)",
        "Operating System :: OS Independent",
    ],
    install_requires=["channels", "django", "channels_redis"],
    entry_points="",
)
