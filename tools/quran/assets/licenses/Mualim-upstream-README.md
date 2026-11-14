---
language:
- ar
license: apache-2.0
size_categories:
- 100K<n<1M
task_categories:
- automatic-speech-recognition
- text-to-speech
- audio-classification
pretty_name: Quranic Recitation Dataset (Word-by-Word & Zero-Bleed Verses)
tags:
- quran
- audio
- speech
- religion
- arabic
- word-by-word
- recitation
- opus
- protobuf
---

<p align="center">
  <img src="./banner.png" alt="Quranic Recitation Dataset Banner" width="100%">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Audio%20Format-Opus%20(48kHz%20VBR)-emerald?style=for-the-badge&logo=opus" alt="Opus Format">
  <img src="https://img.shields.io/badge/Total%20Reciters-128-blue?style=for-the-badge" alt="Total Reciters">
  <img src="https://img.shields.io/badge/Timing%20Format-Protocol%20Buffers%20%2B%20JSON-violet?style=for-the-badge" alt="Protobuf">
  <img src="https://img.shields.io/badge/Architecture-Verses%20%2B%20Full%20Surah-teal?style=for-the-badge" alt="Architecture">
  <img src="https://img.shields.io/badge/CDN-Cloudflare%20Edge-orange?style=for-the-badge&logo=cloudflare" alt="Cloudflare CDN">
  <img src="https://img.shields.io/badge/License-Apache%202.0-green?style=for-the-badge" alt="License">
</p>

---

## 🌟 Overview

**Quranic Recitation Dataset (Word-by-Word Sync & Zero-Bleed Verses)** is a high-quality, production-ready dataset containing studio audio recitations of the Holy Quran synchronized at the **word-by-word** level.

This dataset features **128 world-renowned reciters**, organized into a dual-layout architecture:
1. **`Verses/`** — Sample-exact, zero-bleed verse audio files (`<s3><a3>.opus`) generated using acoustic silence boundary detection with 10ms cosine fade-in and 15ms cosine fade-out, accompanied by verse-relative word timing in both JSON (`<s3>.json`) and Protocol Buffer (`<s3>.pb`) formats.
2. **`Full Surah/`** — Continuous full-surah audio files (`<s3>.opus`) with surah-relative word timestamps (`<s3>.json` and `<s3>.pb`).

Served globally via a **Cloudflare Edge CDN** (`cdn.mualim.app`) with native HTTP 206 partial content range requests and CORS support for instant mobile and web streaming.

---

## 🚀 Key Features

* **128 Reciters × 114 Surahs** — Over 800,000 sample-exact audio files with accompanying timing data.
* **Zero-Bleed Verse Slices** — Every verse cut is acoustically guaranteed to start strictly after the previous verse has concluded ($t_{\text{cut}} \ge t_{\text{last\_end}}$) and before the next verse begins ($t_{\text{cut}} \le t_{\text{next\_start}}$), eliminating cross-verse speech bleed.
* **48 kHz Opus Encoding** — Decoded from high-fidelity 48 kHz PCM and encoded at 48 kbps VBR Opus for exceptional vocal clarity at ultra-low bandwidth.
* **Dual Timing Serialization** — Binary Protocol Buffers (`.pb`) for minimal bundle sizes and instant mobile parsing, plus standard JSON (`.json`) for web players.
* **Cloudflare Edge CDN** — Global delivery from `https://cdn.mualim.app` with edge caching, Range request seeking, and zero-latency seeking.

---

## 📡 CDN Access (`cdn.mualim.app`)

Every reciter serves data through the Cloudflare Edge Worker at `cdn.mualim.app`. All reciters automatically take verse data from the `Verses/` folder:

### 1. Per-Verse Audio (Zero-Bleed)
```
https://cdn.mualim.app/{slug}/{surah}/{surah}{ayah}.opus
```
*Example:*
```bash
# Mishari Rashid Al-Afasy — Surah Al-Fatihah, Ayah 1
curl https://cdn.mualim.app/mishari-rashid-al-afasy-murattal/001/001001.opus

# Ahmad Alnufais — Surah Al-Baqarah, Ayah 146
curl https://cdn.mualim.app/ahmad-alnufais-murattal/002/002146.opus
```

### 2. Per-Verse Timing Data (Protocol Buffer & JSON)
```
https://cdn.mualim.app/{slug}/{surah}.pb
https://cdn.mualim.app/{slug}/{surah}.json
```
*Example:*
```bash
curl https://cdn.mualim.app/mishari-rashid-al-afasy-murattal/001.pb
curl https://cdn.mualim.app/mishari-rashid-al-afasy-murattal/001.json
```

### 3. Continuous Full Surah Audio
```
https://cdn.mualim.app/{slug}/{surah}.opus
```
*Example:*
```bash
curl https://cdn.mualim.app/mishari-rashid-al-afasy-murattal/001.opus
```

### 4. HTTP Range Requests (Mobile Audio Seeking)
```bash
curl -H "Range: bytes=0-1024" https://cdn.mualim.app/mishari-rashid-al-afasy-murattal/001/001001.opus
# → HTTP/2 206 Partial Content ✅
```

---

## 📂 Dataset Repository Structure

```
Quranic-Recitation-Data/
└── <Reciter Name (Style)>/
    ├── Full Surah/
    │   └── <s3>/
    │       ├── <s3>.opus    (Continuous full surah audio)
    │       ├── <s3>.json    (Surah-relative word timestamps)
    │       └── <s3>.pb      (Surah-relative word protobuf)
    └── Verses/
        └── <s3>/
            ├── <s3><a3>.opus (Sample-exact, zero-bleed verse audio)
            ├── <s3>.json     (Verse-relative word timestamps)
            └── <s3>.pb       (Verse-relative word protobuf)
```

---

## 🔗 CDN Slug Map (128 Reciters)

| # | CDN Slug | Folder Name |
|---|---|---|
| 1 | `abdallah-abdal-murattal` | Abdallah Abdal (Murattal) |
| 2 | `abdul-basit-abdul-samad-mujawwad` | Abdul Basit Abdul Samad (Mujawwad) |
| 3 | `abdul-basit-abdul-samad-murattal` | Abdul Basit Abdul Samad (Murattal) |
| 4 | `abdul-rahman-al-sudais-murattal` | Abdul Rahman Al Sudais (Murattal) |
| 5 | `abdul-rashid-sufi-murattal` | Abdul Rashid Sufi (Murattal) |
| 6 | `abdul-munim-abdul-mubdi-murattal` | Abdul-Munim Abdul-Mubdi (Murattal) |
| 7 | `abdulazeez-al-ahmad-murattal` | AbdulAzeez al-Ahmad (Murattal) |
| 8 | `abdulaziz-bin-saleh-al-zahrani-murattal` | Abdulaziz bin Saleh al-Zahrani (Murattal) |
| 9 | `abdulbadi-ghailan-murattal` | Abdulbadi Ghailan (Murattal) |
| 10 | `abdulbari-ath-thubaity-murattal` | AbdulBari ath-Thubaity (Murattal) |
| 11 | `abdulbaset-abdulsamad-warsh` | AbdulBaset AbdulSamad (Warsh) |
| 12 | `abdulkareem-al-hazmi-murattal` | AbdulKareem Al Hazmi (Murattal) |
| 13 | `abdullah-al-buaijan-murattal` | Abdullah Al Buaijan (Murattal) |
| 14 | `abdullah-al-musa-murattal` | Abdullah Al Musa (Murattal) |
| 15 | `abdullah-al-qarafi-murattal` | Abdullah Al Qarafi (Murattal) |
| 16 | `abdullah-ali-jabir-murattal` | Abdullah Ali Jabir (Murattal) |
| 17 | `abdullah-awad-al-juhani-murattal` | Abdullah Awad al-Juhani (Murattal) |
| 18 | `abdullah-basfar-murattal` | Abdullah Basfar (Murattal) |
| 19 | `abdullah-hamad-abu-sharida-murattal` | Abdullah Hamad Abu Sharida (Murattal) |
| 20 | `abdullah-khayat-murattal` | Abdullah Khayat (Murattal) |
| 21 | `abdullah-matroud-murattal` | Abdullah Matroud (Murattal) |
| 22 | `abdulmuhsin-al-qasim-murattal` | AbdulMuhsin al-Qasim (Murattal) |
| 23 | `abdulrahman-al-shahat-murattal` | Abdulrahman al-Shahat (Murattal) |
| 24 | `abdulrahman-al-zawawi-murattal` | Abdulrahman Al-Zawawi (Murattal) |
| 25 | `abdulwadud-haneef-murattal` | AbdulWadud Haneef (Murattal) |
| 26 | `abdur-rashid-sufi-murattal` | Abdur-Rashid Sufi (Murattal) |
| 27 | `abdur-razaq-bin-abtan-al-dulaimi-mujawwad` | Abdur-Razaq bin Abtan al-Dulaimi (Mujawwad) |
| 28 | `abu-bakr-al-shatri-murattal` | Abu Bakr Al Shatri (Murattal) |
| 29 | `adel-kalbani-murattal` | Adel Kalbani (Murattal) |
| 30 | `ahmad-alnufais-murattal` | Ahmad Alnufais (Murattal) |
| 31 | `ahmad-nauina-murattal` | Ahmad Nauina (Murattal) |
| 32 | `ahmed-abdel-razeq-nasr-murattal` | Ahmed Abdel Razeq Nasr (Murattal) |
| 33 | `ahmed-abdelhamid-tahoun-murattal` | Ahmed Abdelhamid Tahoun (Murattal) |
| 34 | `ahmed-al-haddad-murattal` | Ahmed Al Haddad (Murattal) |
| 35 | `ahmed-al-maasrawi-murattal` | Ahmed Al Maasrawi (Murattal) |
| 36 | `ahmed-al-shafii-murattal` | Ahmed Al Shafi’i (Murattal) |
| 37 | `ahmed-al-ruzaiqi-murattal` | Ahmed Al-Ruzaiqi (Murattal) |
| 38 | `ahmed-bin-talib-hamid-murattal` | Ahmed bin Talib Hamid (Murattal) |
| 39 | `ahmed-diban-murattal` | Ahmed Diban (Murattal) |
| 40 | `ahmed-el-batal-murattal` | Ahmed El Batal (Murattal) |
| 41 | `ahmed-ibn-ali-al-ajmy-murattal` | Ahmed ibn Ali Al Ajmy (Murattal) |
| 42 | `ahmed-kaseb-murattal` | Ahmed Kaseb (Murattal) |
| 43 | `ahmed-tamim-al-maraghi-murattal` | Ahmed Tamim Al-Maraghi (Murattal) |
| 44 | `akram-al-alaqmi-murattal` | Akram Al-Alaqmi (Murattal) |
| 45 | `al-shahat-muhammad-anwar-murattal` | Al Shahat Muhammad Anwar (Murattal) |
| 46 | `al-hussayni-al-azazy-children-murattal` | Al-Hussayni Al-Azazy (Children) (Murattal) |
| 47 | `alaa-aql-murattal` | Alaa Aql (Murattal) |
| 48 | `ali-abdur-rahman-al-huthaify-murattal` | Ali Abdur-Rahman al-Huthaify (Murattal) |
| 49 | `ali-hajjaj-alsouasi-murattal` | Ali Hajjaj Alsouasi (Murattal) |
| 50 | `alijon-qari-murattal` | Alijon Qari (Murattal) |
| 51 | `alzain-mohammad-ahmad-murattal` | Alzain Mohammad Ahmad (Murattal) |
| 52 | `amer-al-kazemi-murattal` | Amer Al Kazemi (Murattal) |
| 53 | `antar-said-muslim-murattal` | Antar Said Muslim (Murattal) |
| 54 | `asim-abdul-aleem-murattal` | Asim Abdul Aleem (Murattal) |
| 55 | `asim-al-luhaidan-murattal` | Asim Al Luhaidan (Murattal) |
| 56 | `ayman-suwaid-muallim` | Ayman Suwaid (Muallim) |
| 57 | `aziz-alili-murattal` | Aziz Alili (Murattal) |
| 58 | `badr-al-turki-murattal` | Badr Al Turki (Murattal) |
| 59 | `bandar-baleela-murattal` | Bandar Baleela (Murattal) |
| 60 | `elias-hagari-murattal` | Elias Hagari (Murattal) |
| 61 | `faisal-alhajri-murattal` | Faisal Alhajri (Murattal) |
| 62 | `fares-abbad-murattal` | Fares Abbad (Murattal) |
| 63 | `farman-shawani-murattal` | Farman Shawani (Murattal) |
| 64 | `fatih-seferagic-murattal` | Fatih Seferagic (Murattal) |
| 65 | `hade-toure-murattal` | Hade Toure (Murattal) |
| 66 | `haitham-al-dukhin-murattal` | Haitham Al Dukhin (Murattal) |
| 67 | `haitham-al-jadaani-murattal` | Haitham Al Jadaani (Murattal) |
| 68 | `hamad-sinan-murattal` | Hamad Sinan (Murattal) |
| 69 | `hamed-shaker-najad-murattal` | Hamed Shaker Najad (Murattal) |
| 70 | `hani-ar-rifai-murattal` | Hani Ar Rifai (Murattal) |
| 71 | `hassan-al-wajdi-murattal` | Hassan Al Wajdi (Murattal) |
| 72 | `ibrahim-al-akhdar-murattal` | Ibrahim Al Akhdar (Murattal) |
| 73 | `idris-abkar-murattal` | Idris Abkar (Murattal) |
| 74 | `imad-zuhair-hafez-murattal` | Imad Zuhair Hafez (Murattal) |
| 75 | `immas-of-al-masjed-al-haram-murattal` | Immas of Al Masjed Al Haram (Murattal) |
| 76 | `islam-othman-murattal` | Islam Othman (Murattal) |
| 77 | `khalid-al-jalil-murattal` | Khalid Al Jalil (Murattal) |
| 78 | `khalid-al-qahtani-murattal` | Khalid al-Qahtani (Murattal) |
| 79 | `khalifa-al-tunaiji-murattal` | Khalifa Al Tunaiji (Murattal) |
| 80 | `maher-al-muaiqly-murattal` | Maher Al Muaiqly (Murattal) |
| 81 | `mahmood-ali-al-bana-murattal` | Mahmood Ali Al-Bana (Murattal) |
| 82 | `mahmoud-khalil-al-husary-mualim` | Mahmoud Khalil Al Husary (Mualim) |
| 83 | `mahmoud-khalil-al-husary-mujawwad` | Mahmoud Khalil Al Husary (Mujawwad) |
| 84 | `mahmoud-khalil-al-husary-murattal` | Mahmoud Khalil Al Husary (Murattal) |
| 85 | `mansour-al-salmi-murattal` | Mansour Al Salmi (Murattal) |
| 86 | `mishari-rashid-al-afasy-murattal` | Mishari Rashid Al Afasy (Murattal) |
| 87 | `mohamed-al-tablawi-murattal` | Mohamed Al Tablawi (Murattal) |
| 88 | `mohamed-ayoub-murattal` | Mohamed Ayoub (Murattal) |
| 89 | `mohamed-ellhidan-murattal` | Mohamed Ellhidan (Murattal) |
| 90 | `mohamed-salem-ould-zine-murattal` | Mohamed Salem Ould Zine (Murattal) |
| 91 | `mohammad-ismaeel-al-muqaddim-murattal` | Mohammad Ismaeel Al-Muqaddim (Murattal) |
| 92 | `mohammed-alfaqih-murattal` | Mohammed Alfaqih (Murattal) |
| 93 | `mostafa-ismaeel-murattal` | Mostafa Ismaeel (Murattal) |
| 94 | `muhammad-abdul-kareem-murattal` | Muhammad Abdul-Kareem (Murattal) |
| 95 | `muhammad-al-ghazali-murattal` | Muhammad Al Ghazali (Murattal) |
| 96 | `muhammad-al-luhaidan-murattal` | Muhammad Al Luhaidan (Murattal) |
| 97 | `muhammad-hassan-murattal` | Muhammad Hassan (Murattal) |
| 98 | `muhammad-jibreel-murattal` | Muhammad Jibreel (Murattal) |
| 99 | `muhammad-siddiq-al-minshawi-kids` | Muhammad Siddiq Al Minshawi (Kids) |
| 100 | `muhammad-siddiq-al-minshawi-murattal` | Muhammad Siddiq Al Minshawi (Murattal) |
| 101 | `muhammad-sulaiman-patel-murattal` | Muhammad Sulaiman Patel (Murattal) |
| 102 | `mukhtar-al-hajj-murattal` | Mukhtar Al-Hajj (Murattal) |
| 103 | `mustafa-al-azawi-murattal` | Mustafa al-Azawi (Murattal) |
| 104 | `nabil-ar-rifai-murattal` | Nabil Ar Rifai (Murattal) |
| 105 | `naser-al-katamy-murattal` | Naser Al Katamy (Murattal) |
| 106 | `nasser-al-qatami-murattal` | Nasser Al Qatami (Murattal) |
| 107 | `noreen-muhammad-siddiq-murattal` | Noreen Muhammad Siddiq (Murattal) |
| 108 | `noreen-siddiq-duri-an-abu-amr` | Noreen Siddiq (Duri an Abu Amr) |
| 109 | `okasha-kameny-murattal` | Okasha Kameny (Murattal) |
| 110 | `osama-al-safi-murattal` | Osama Al-Safi (Murattal) |
| 111 | `osama-muhammad-abu-zaid-murattal` | Osama Muhammad Abu Zaid (Murattal) |
| 112 | `peshawa-qadir-al-kurdi-murattal` | Peshawa Qadir al-Kurdi (Murattal) |
| 113 | `qari-bilal-muaz-murattal` | Qari Bilal Muaz (Murattal) |
| 114 | `qari-khushi-muhammad-al-azhari-murattal` | Qari Khushi Muhammad Al-Azhari (Murattal) |
| 115 | `raad-mohammad-al-kurdi-murattal` | Raad Mohammad Al Kurdi (Murattal) |
| 116 | `rayyan-al-muhaisani-murattal` | Rayyan Al-Muhaisani (Murattal) |
| 117 | `saad-al-ghamdi-murattal` | Saad Al Ghamdi (Murattal) |
| 118 | `sadaqat-ali-murattal` | Sadaqat Ali (Murattal) |
| 119 | `sahl-yasin-murattal` | Sahl Yasin (Murattal) |
| 120 | `salah-al-budair-murattal` | Salah al-Budair (Murattal) |
| 121 | `salah-bukhatir-murattal` | Salah Bukhatir (Murattal) |
| 122 | `salman-obaid-al-mutairi-murattal` | Salman Obaid Al Mutairi (Murattal) |
| 123 | `saud-al-shuraim-murattal` | Saud Al Shuraim (Murattal) |
| 124 | `shaya-al-tamimi-murattal` | Shaya Al Tamimi (Murattal) |
| 125 | `tawfeeq-bin-saeed-as-sawaaigh-murattal` | Tawfeeq bin Saeed As Sawaaigh (Murattal) |
| 126 | `wadee-hammadi-al-yamani-murattal` | Wadee Hammadi Al Yamani (Murattal) |
| 127 | `yasser-al-dosari-murattal` | Yasser Al Dosari (Murattal) |
| 128 | `youssef-al-aidarous-murattal` | Youssef Al Aidarous (Murattal) |

---

## 📜 Data License & Usage

**License:** `Apache-2.0`

This dataset is free and open-source for personal, educational, and commercial applications under the **Apache License 2.0**. You are encouraged to integrate this directly into mobile apps (Flutter, React Native, iOS, Android) and web platforms.
