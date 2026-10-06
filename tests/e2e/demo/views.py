from django.shortcuts import render

PAGES = {
    "home": {"title": "Home | LiveView Test", "url": "/"},
    "about": {"title": "About | LiveView Test", "url": "/about/"},
    "contact": {"title": "Contact | LiveView Test", "url": "/contact/"},
    "products": {"title": "Products | LiveView Test", "url": "/products/"},
    "blog": {"title": "Blog | LiveView Test", "url": "/blog/"},
}


def page_view(request, page):
    return render(
        request,
        "demo/base.html",
        {
            "title": PAGES[page]["title"],
            "page_template": f"demo/pages/{page}.html",
        },
    )
