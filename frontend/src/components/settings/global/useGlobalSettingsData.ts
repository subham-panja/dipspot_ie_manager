'use client';

import { useState, useEffect } from 'react';
import { fetchJson } from '@/lib/api';
import {
  Stage,
  ModalSmtpConfig,
  CrawlerConfig,
  CompetitorQuote,
} from './globalSettingsTypes';

export function useGlobalSettingsData(isOpen: boolean) {
  const [smtp, setSmtp] = useState<ModalSmtpConfig>({
    host: 'smtp.gmail.com',
    port: 587,
    username: 'exports@tradepulse.exim',
    password: '',
    from_name: 'TradePulse Commercial Exports',
    from_email: 'exports@tradepulse.exim',
    use_tls: true,
    use_ssl: false,
    is_verified: true,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [smtpStatusMsg, setSmtpStatusMsg] = useState('');

  const [crawler, setCrawler] = useState<CrawlerConfig | null>(null);
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlStatusMsg, setCrawlStatusMsg] = useState('');

  const [quotes, setQuotes] = useState<CompetitorQuote[]>([]);
  const [pipelineStages, setPipelineStages] = useState<Stage[]>([]);
  const [shipmentStages, setShipmentStages] = useState<Stage[]>([]);

  const loadSettingsData = async () => {
    try {
      const [smtpRes, crawlerRes, pricingRes, pipeRes, shipRes] = await Promise.all([
        fetchJson<{ smtp: ModalSmtpConfig }>('/config/smtp').catch(() => ({ smtp: null as any })),
        fetchJson<{ crawler: CrawlerConfig }>('/config/crawler').catch(() => ({ crawler: null as any })),
        fetchJson<{ quotes: CompetitorQuote[] }>('/intelligence/competitor-pricing').catch(() => ({ quotes: [] })),
        fetchJson<{ stages: Stage[] }>('/pipeline/stages').catch(() => ({ stages: [] })),
        fetchJson<{ stages: Stage[] }>('/shipments/stages').catch(() => ({ stages: [] })),
      ]);

      if (smtpRes?.smtp) setSmtp(smtpRes.smtp);
      if (crawlerRes?.crawler) setCrawler(crawlerRes.crawler);
      if (pricingRes?.quotes) setQuotes(pricingRes.quotes);
      if (pipeRes?.stages) setPipelineStages(pipeRes.stages);
      if (shipRes?.stages) setShipmentStages(shipRes.stages);
    } catch (e) {
      console.error('Failed to load settings data', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadSettingsData();
    }
  }, [isOpen]);

  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetchJson<{ smtp: ModalSmtpConfig; message: string }>('/config/smtp', {
        method: 'PATCH',
        body: JSON.stringify(smtp),
      });
      setSmtp(res.smtp);
      setSmtpStatusMsg('Gmail SMTP preferences saved successfully!');
      setTimeout(() => setSmtpStatusMsg(''), 4000);
    } catch (err: any) {
      alert('Failed to save SMTP: ' + err.message);
    }
  };

  const handleTestSmtp = async () => {
    setTestingSmtp(true);
    setSmtpStatusMsg('');
    try {
      const res = await fetchJson<{ success: boolean; message: string }>('/config/smtp/test', {
        method: 'POST',
        body: JSON.stringify({ recipient: smtp.from_email }),
      });
      setSmtpStatusMsg(res.message);
      setSmtp((prev) => ({ ...prev, is_verified: true, last_tested_at: new Date().toISOString() }));
      setTimeout(() => setSmtpStatusMsg(''), 6000);
    } catch (err: any) {
      alert('SMTP test failed: ' + err.message);
    } finally {
      setTestingSmtp(false);
    }
  };

  const handleSaveCrawler = async () => {
    if (!crawler) return;
    try {
      const res = await fetchJson<{ crawler: CrawlerConfig; message: string }>('/config/crawler', {
        method: 'PATCH',
        body: JSON.stringify(crawler),
      });
      setCrawler(res.crawler);
      setCrawlStatusMsg('Crawler sources and commodities saved!');
      setTimeout(() => setCrawlStatusMsg(''), 4000);
    } catch (err: any) {
      alert('Failed to save crawler settings: ' + err.message);
    }
  };

  const handleTriggerInstantCrawl = async (leadType: string = 'all') => {
    setIsCrawling(true);
    setCrawlStatusMsg('');
    try {
      const res = await fetchJson<{ message: string }>('/scrape/crawl-now', {
        method: 'POST',
        body: JSON.stringify({ lead_type: leadType }),
      });
      setCrawlStatusMsg(res.message || 'Crawl job successfully queued in background!');
      setTimeout(() => setCrawlStatusMsg(''), 5000);
    } catch (err: any) {
      alert('Failed to trigger crawler: ' + err.message);
    } finally {
      setIsCrawling(false);
    }
  };

  const handleAddCompetitorQuote = async (newQuote: any) => {
    try {
      await fetchJson('/intelligence/competitor-pricing', {
        method: 'POST',
        body: JSON.stringify(newQuote),
      });
      loadSettingsData();
    } catch (err: any) {
      alert('Failed to add competitor quote: ' + err.message);
    }
  };

  const handleDeleteCompetitorQuote = async (quoteId: string) => {
    if (!confirm(`Delete competitor quote ${quoteId}?`)) return;
    try {
      await fetchJson(`/intelligence/competitor-pricing/${quoteId}`, { method: 'DELETE' });
      loadSettingsData();
    } catch (err: any) {
      alert('Failed to delete quote: ' + err.message);
    }
  };

  return {
    smtp,
    setSmtp,
    showPassword,
    setShowPassword,
    testingSmtp,
    smtpStatusMsg,
    handleSaveSmtp,
    handleTestSmtp,
    crawler,
    setCrawler,
    isCrawling,
    crawlStatusMsg,
    handleSaveCrawler,
    handleTriggerInstantCrawl,
    quotes,
    handleAddCompetitorQuote,
    handleDeleteCompetitorQuote,
    pipelineStages,
    shipmentStages,
  };
}
