from setuptools import setup, find_packages

setup(
    name="reconpro",
    version="2.0.0",
    author="ReconPro Security",
    author_email="security@reconpro.io",
    description=(
        "ReconPro Enterprise — The Security Reconnaissance Platform. "
        "Eight Blades. One Target. One Verdict. "
        "8 modules: RECON, AUTH BYPASS, CHAIN HUNTER, BOT HUNTER, "
        "GORGON ULTRA, OBLIVION, VIBESEC, NHI GRAPH."
    ),
    long_description=open("README.md").read(),
    long_description_content_type="text/markdown",
    url="https://github.com/reconpro-security/reconpro",
    license="MIT",
    packages=find_packages(),
    python_requires=">=3.8",
    install_requires=[
        "rich>=13.0.0",
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