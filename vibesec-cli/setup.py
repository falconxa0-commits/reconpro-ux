from setuptools import setup, find_packages

setup(
    name="reconpro",
    version="10.0.0",
    author="ReconPro Security",
    author_email="security@reconpro.io",
    description=(
        "ReconPro Nexus v10 — Autonomous Security Operating System. "
        "16 Scanning Modules. 11 Intelligence Subsystems. 4 Autonomous Systems. "
        "Multi-Agent Runtime. Evidence Correlation. Executive Intelligence."
    ),
    long_description=open("README.md").read(),
    long_description_content_type="text/markdown",
    url="https://github.com/reconpro-security/reconpro",
    license="MIT",
    packages=find_packages(),
    python_requires=">=3.8",
    install_requires=[
        "rich>=13.0.0",
        "textual>=0.40.0",
        "requests>=2.28.0",
    ],
    entry_points={
        "console_scripts": [
            "reconpro=reconpro.cli:main",
        ],
    },
    classifiers=[
        "Development Status :: 4 - Beta",
        "Environment :: Console",
        "Intended Audience :: Developers",
        "Intended Audience :: Information Technology",
        "Intended Audience :: System Administrators",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Topic :: Security",
        "Topic :: Software Development :: Testing",
        "Typing :: Typed",
    ],
    keywords=[
        "security", "scanner", "reconnaissance", "vulnerability",
        "reconpro", "vibesec", "pentest", "red-team", "auth-bypass",
        "ssrf", "bot-detection", "nhi", "cloud-security",
    ],
)