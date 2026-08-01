from setuptools import setup, find_packages

setup(
    name="vibesec",
    version="0.1.0",
    author="ReconPro Security",
    author_email="security@reconpro.io",
    description="AI/Vibe-Coding Vulnerability Benchmark — Is your AI-built app secure?",
    long_description=open("README.md").read(),
    long_description_content_type="text/markdown",
    url="https://github.com/reconpro-security/vibesec",
    license="MIT",
    packages=find_packages(),
    python_requires=">=3.8",
    install_requires=[
        "rich>=13.0.0",
    ],
    entry_points={
        "console_scripts": [
            "vibesec=vibesec.cli:main",
        ],
    },
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Environment :: Console",
        "Intended Audience :: Developers",
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
    keywords=["security", "scanner", "vibe-coding", "ai", "vulnerability", "benchmark", "vibesec"],
)
