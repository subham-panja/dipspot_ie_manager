"""Composite realistic web scraper class assembling modular mixins."""

from app.scraper.http_client import HttpClientMixin
from app.scraper.search_engines import SearchEnginesMixin
from app.scraper.contact_extractor import ContactExtractorMixin
from app.scraper.directory_crawlers import DirectoryCrawlersMixin
from app.scraper.manifest_crawlers import ManifestCrawlersMixin
from app.scraper.source_dispatcher import SourceDispatcherMixin


class RealisticWebScraper(
    HttpClientMixin,
    SearchEnginesMixin,
    ContactExtractorMixin,
    DirectoryCrawlersMixin,
    ManifestCrawlersMixin,
    SourceDispatcherMixin,
):
    """Modular industrial web scraping and lead extraction engine."""
    pass
