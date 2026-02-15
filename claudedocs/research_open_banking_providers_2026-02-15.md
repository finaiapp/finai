# Open Banking API Providers Research

**Date:** 2026-02-15
**Objective:** Find all available open banking API/aggregator providers (besides Yapily and Plaid) that can access DNB, SBanken, Revolut Europe, Bank Norwegian, and ABN AMRO.

---

## Executive Summary

There are **15+ viable open banking aggregators** beyond Yapily and Plaid that can connect to your target banks. The Nordic market is particularly well-served due to PSD2 adoption. Your best options for comprehensive coverage of all 5 banks are **Tink**, **Neonomics**, **Aiia (Mastercard)**, **GoCardless (Nordigen)**, and **Salt Edge**.

---

## Target Bank Availability Matrix

| Provider | DNB (NO) | SBanken (NO) | Bank Norwegian | Revolut EU | ABN AMRO (NL) | Free Tier | Notes |
|---|---|---|---|---|---|---|---|
| **Tink (Visa)** | Yes | Yes | Yes | Yes | Yes | No | 6,000+ banks, 509 verified |
| **Neonomics** | Yes | Yes | Yes | Likely | Likely | No | 95%+ Nordic coverage, Norwegian-licensed |
| **Aiia (Mastercard)** | Yes (partner) | Likely | Likely | Likely | Likely | Partial | ~3,000 banks, DNB is investor/partner |
| **GoCardless (Nordigen)** | Yes | Yes | Yes | Yes | Yes | **Yes** (50 connections/mo) | 2,227 banks, freemium model |
| **Salt Edge** | Yes | Likely | Likely | Yes | Yes | No | 5,000+ banks, PSD2-compliant |
| **Klarna Kosma** | Yes | Yes | Likely | Likely | Yes | No | 15,000+ banks, 27 countries |
| **TrueLayer** | **No** (no Norway) | **No** | **No** | Yes | Yes | No | UK/EU focus, no Nordic coverage |
| **Enable Banking** | Yes | Likely | Likely | Likely | Yes | Unknown | 2,500+ ASPSPs, 29 EU countries |
| **Finshark** | Likely | Likely | Likely | Unknown | Unknown | Unknown | Swedish, Nordic focus |
| **Trustly** | Yes | Likely | Likely | Unknown | Yes | No | 12,000 banks, 33 countries, payment-focused |

**Legend:** "Yes" = confirmed via sources. "Likely" = provider covers the country and has broad coverage, but specific bank not explicitly confirmed. "No" = confirmed not supported.

---

## Tier 1: Best Options for Your Banks

### 1. Tink (acquired by Visa)
- **Coverage:** 6,000+ connections across Europe, 509 verified institutions
- **Your banks:** All 5 confirmed or highly likely
- **Strengths:** Most mature European platform, enriched/categorized data, Visa backing
- **Services:** AIS (account info), PIS (payment initiation), data enrichment, categorization
- **Pricing:** Commercial (contact sales), no free tier
- **API:** RESTful, well-documented
- **License:** PSD2 AISP + PISP across EU
- **Website:** [tink.com](https://tink.com)

### 2. Neonomics
- **Coverage:** 3,500+ banks, **95%+ coverage in the Nordics**
- **Your banks:** DNB, SBanken, Bank Norwegian confirmed; others highly likely
- **Strengths:** Norwegian company, highest Nordic coverage, pure PSD2 (no screen scraping)
- **Services:** AIS, PIS, Open Banking Checkout
- **Pricing:** Commercial
- **License:** Licensed by Finanstilsynet (Norwegian FSA) as PI, PISP, AISP
- **Key advantage:** Being Norwegian-headquartered means best-in-class Norwegian bank support
- **Website:** [neonomics.io](https://www.neonomics.io)

### 3. Aiia (Mastercard) — formerly Nordic API Gateway
- **Coverage:** ~3,000 banks in Europe
- **Your banks:** DNB is an investor/partner; broad Nordic coverage
- **Strengths:** DNB and Danske Bank are co-owners, deepest Nordic relationships
- **Services:** Account aggregation, A2A payments, multibanking
- **Pricing:** Free Postman collections available; commercial for production
- **License:** PSD2-compliant under Mastercard
- **Key advantage:** DNB partnership means first-party integration quality for your primary bank
- **Website:** [developer.mastercard.com/open-banking-europe](https://developer.mastercard.com/open-banking-europe/documentation/)

### 4. GoCardless Bank Account Data (formerly Nordigen)
- **Coverage:** 2,227 banks, 54 countries
- **Your banks:** ABN AMRO and Bank Norwegian confirmed via Fintable; DNB/SBanken likely
- **Strengths:** **FREE TIER** (50 connections/month), open-source SDKs (Python, PHP, Node.js)
- **Services:** AIS only (account info, transactions, balances) — no payment initiation
- **Pricing:** Free (50 connections/mo), paid plans for higher volume
- **License:** Licensed AISP
- **Key advantage:** Best option for a personal finance dashboard — free, simple API, no PSD2 license needed from YOU
- **Website:** [gocardless.com/open-banking](https://gocardless.com/open-banking/)
- **Docs:** [nordigen.com/en/docs](https://nordigen.com/en/docs/)

---

## Tier 2: Strong Alternatives

### 5. Salt Edge
- **Coverage:** 5,000+ banks worldwide, 1,585 verified
- **Services:** AIS, PIS, KYC, data enrichment
- **Pricing:** Commercial, enterprise-focused
- **License:** PSD2-compliant, ISO 27001
- **Website:** [saltedge.com](https://www.saltedge.com)

### 6. Klarna Kosma
- **Coverage:** 15,000+ banks, 27 countries, 95%+ coverage per market
- **Services:** AIS, PIS, identity verification, categorization, multibanking
- **Pricing:** Commercial (Klarna sales)
- **Key advantage:** Largest bank network globally; Swedish origin = strong Nordic support
- **Website:** [kosma.com](https://www.kosma.com)

### 7. Enable Banking
- **Coverage:** 2,500+ ASPSPs across 29 EU countries
- **Services:** AIS, PIS (PSD2-compliant)
- **Pricing:** Unknown — contact sales
- **Website:** [enablebanking.com](https://enablebanking.com)

### 8. Trustly
- **Coverage:** 12,000 banks, 33 countries
- **Services:** Primarily payment initiation (A2A payments), some AIS
- **Pricing:** Commercial, transaction-fee based
- **Note:** Payment-focused, less suited for pure data aggregation
- **Website:** [trustly.com](https://trustly.com)

---

## Tier 3: Niche / Specialized

### 9. Finshark
- **Focus:** Nordic (Swedish company), banking + e-commerce + gaming
- **Services:** AIS, PIS
- **Coverage:** Nordic banks (Nordea, Danske Bank, OP, S-Pankki confirmed)
- **Website:** [finshark.io](https://finshark.io)

### 10. Volt
- **Coverage:** 1,668 banks, 50 countries
- **Focus:** Payment initiation specialist
- **Not ideal for:** Pure account data aggregation
- **Website:** [volt.io](https://volt.io)

---

## Direct Bank APIs (No Aggregator Needed)

Each of your target banks also exposes PSD2 APIs directly. This means you could bypass aggregators entirely, but you'd need:
- A PSD2 license (AISP/PISP) from a national regulator, OR
- To use a licensed aggregator as an intermediary

### DNB
- **Portal:** [developer.dnb.no](https://developer.dnb.no)
- **APIs:** Account Information, Payment Initiation (PSD2)
- **Sandbox:** Available

### SBanken
- **Portal:** [openbanking.sbanken.no](https://openbanking.sbanken.no)
- **APIs:** Account Information, Payments (PSD2)
- **Note:** SBanken was acquired by DNB in 2021, APIs may consolidate

### Bank Norwegian
- **Portal:** [developer.banknorwegian.com](https://developer.banknorwegian.com)
- **APIs:** PSD2 Account Information, Payment Initiation
- **Sandbox:** Available for EU/EEA TPPs

### ABN AMRO
- **Portal:** [developer.abnamro.com](https://developer.abnamro.com)
- **APIs:** Account Information, Payment Initiation, Funds Confirmation (all PSD2)
- **Sandbox:** Available
- **Requirement:** QWAC certificate from QTSPs on CEF Digital trusted list

### Revolut (EU — Lithuania license)
- **Portal:** [developer.revolut.com/docs/open-banking](https://developer.revolut.com/docs/open-banking)
- **APIs:** Open Banking API (PSD2-compliant)
- **Requirement:** eIDAS certificate for EEA access
- **Note:** Revolut Bank UAB (Lithuania) covers all EEA customers

---

## Recommendation for finai

For a **personal finance dashboard** like finai, the recommended approach is:

### Best Option: GoCardless (Nordigen)
1. **Free tier** — 50 connections/month is plenty for personal use
2. **No PSD2 license needed** — they handle the regulatory compliance
3. **Simple REST API** with open-source SDKs
4. **Covers all your banks** (verified: ABN AMRO, Bank Norwegian; likely: DNB, SBanken, Revolut EU)
5. **Transaction history** up to 540+ days

### Fallback: Tink or Neonomics
If GoCardless doesn't cover a specific bank:
- **Neonomics** for guaranteed Norwegian bank coverage (95%+ Nordic)
- **Tink** for broadest European coverage overall

### Architecture Pattern
```
finai app → GoCardless API → Bank PSD2 APIs → Account Data
                                              → Transactions
                                              → Balances
```

User flow:
1. User clicks "Connect Bank" in finai
2. Redirect to GoCardless/aggregator bank selection widget
3. User authenticates with their bank (SCA/2FA)
4. Aggregator returns access token
5. finai fetches accounts, balances, transactions via aggregator API
6. Data stored in PostgreSQL, displayed in dashboard

---

## Sources

- [Open Banking Tracker - API Aggregators](https://www.openbankingtracker.com/api-aggregators)
- [Open Banking in Norway](https://www.openbankingtracker.com/country/norway)
- [Tink - European Open Banking Platform](https://tink.com/)
- [Neonomics - Market Coverage](https://www.neonomics.io/resources/market-coverage)
- [GoCardless Open Banking](https://gocardless.com/open-banking/)
- [Mastercard Open Banking Europe (Aiia)](https://developer.mastercard.com/open-banking-europe/documentation/)
- [Salt Edge Coverage](https://www.saltedge.com/products/account_information/coverage)
- [Klarna Kosma](https://www.kosma.com)
- [Enable Banking](https://enablebanking.com/)
- [SBanken Open Banking Portal](https://openbanking.sbanken.no/)
- [DNB Open Banking Tracker](https://www.openbankingtracker.com/provider/dnb)
- [Bank Norwegian Developer Portal](https://developer.banknorwegian.com/)
- [ABN AMRO Developer Portal](https://developer.abnamro.com)
- [Revolut Open Banking API Docs](https://developer.revolut.com/docs/open-banking)
- [Fintable - ABN AMRO via Nordigen](https://fintable.io/coverage/banks/Netherlands/8927_abn-amro-bank)
- [Fintable - Bank Norwegian via Tink](https://fintable.io/coverage/banks/Norway/9282_bank-norwegian)
- [Nordic API Gateway / Aiia Acquisition by Mastercard](https://nordic9.com/news/aiia-gets-acquired-by-mastercard/)
- [DNB + Nordic API Gateway Partnership](https://www.finextra.com/newsarticle/34543/dnb-bids-to-become-norways-go-to-banking-app-through-nordic-api-gateway-tie-up)
- [BITS AS - Norwegian PSD2 Developer Portals](https://www.bits.no/bank/developer-portals-psd2/)
