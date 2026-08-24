<p align="center">
  <a href="https://community.obsidian.md/plugins/special-callouts"><img src="https://img.shields.io/badge/Obsidian-Install-7c3aed?logo=obsidian&logoColor=white" alt="Install from Obsidian"/></a>
  <img src="https://img.shields.io/github/stars/ahseyg/special-callouts?style=flat&color=3498db" alt="Stars"/>
  <img src="https://img.shields.io/github/issues/ahseyg/special-callouts?style=flat&color=e74c3c" alt="Issues"/>
  <img src="https://img.shields.io/github/license/ahseyg/special-callouts?style=flat&color=2ecc71" alt="License"/>
  <img src="https://img.shields.io/github/v/release/ahseyg/special-callouts?style=flat&color=f39c12" alt="Version"/>
  <img src="https://img.shields.io/github/v/release/ahseyg/special-callouts?include_prereleases&label=BRAT%20beta&style=flat&color=ff69b4" alt="BRAT Beta Version"/>
  <img src="https://img.shields.io/github/downloads/ahseyg/special-callouts/total?style=flat&color=blueviolet" alt="Downloads"/>
  <a href="skills/special-callouts/"><img src="https://img.shields.io/badge/AI%20Agent%20Skill-haz%C4%B1r-8b5cf6?style=flat" alt="AI Agent Skill"/></a>
</p>

<p align="center">
  <a href="USAGE_GUIDE_TR.md">Kullanım Kılavuzu</a> · <a href="skills/special-callouts/">AI Agent Skill</a> · <a href="README.md">English</a> · <a href="https://github.com/ahseyg/special-callouts/issues">Hata Bildir</a></p>

# Obsidian için Special Callouts

Obsidian notlarınızı premium, dinamik ve tamamen özelleştirilebilir callout'larla dönüştürün. Standart bilgi kutularını dergi kalitesinde düzenlere, kod terminallerine veya neon parlayan uyarılara çevirin. Her şeyi doğrudan markdown'dan özelleştirin — veya görsel ayarlar panelinde yeniden kullanılabilir şablonlar oluşturun.

**Açık kaynak** · MIT Lisansı · Katkılara açık

> [!TIP]
> **Yeni — AI Agent Skill.** Special Callouts artık bir [Agent Skill](skills/special-callouts/) ile
> birlikte geliyor; Claude sözdizimini tahmin etmek yerine callout'ları doğrudan sizin için yazıyor.
> Agent'ınıza ham
> [SKILL.md](https://raw.githubusercontent.com/ahseyg/special-callouts/main/skills/special-callouts/SKILL.md)
> dosyasını verin ya da yerel olarak kurun:
> ```bash
> cp -r skills/special-callouts ~/.claude/skills/
> ```

---

## Özellikler

- **Satır içi özelleştirme** — arka plan, metin, kenarlık, degrade, neon, ikon — doğrudan markdown içinde
- **Özel stil şablonları** — bir kere tasarlayın, ismiyle her yerde kullanın
- **Çok sütunlu listeler** — herhangi bir listeyi 2–4 sütuna bölün
- **Görsel düzen kurucu (Layout Builder)** — sürükle-ve-birleştir mantığıyla ızgara tasarlayın
- **Tipografi kontrolü** — 5 font ailesi, 5 boyut ölçeği
- **Neon ve degrade (gradient) efektleri** — parlayan kenarlıklar, yumuşak renk geçişleri
- **Dataview entegrasyonu** — sütun düzenleri Dataview sorgularıyla uyumlu çalışır
- **İçe/Dışa Aktar** — stilleri JSON olarak kasalar arası paylaşın

---

## Ekran Görüntüleri ve Düzen Kapasitesi

Sınırsız özelleştirme imkanlarını keşfedin.

### Renkler, Degradeler ve Efektler

![Renkler ve Arka Planlar](assets/colors_backgrounds.png)
> [Özel arka plan ve metin renklerini nasıl oluşturacağınızı Kullanım Kılavuzundan öğrenin](USAGE_GUIDE_TR.md#renkler-ve-arka-planlar)

![Degradeler](assets/gradients.png)
> [Degrade arka planları nasıl oluşturacağınızı Kullanım Kılavuzundan öğrenin](USAGE_GUIDE_TR.md#degrade-arka-plan--gradient)

![Neon Parlama Efektleri](assets/neon_glow_effects.png)
> [Neon parlama efektlerini nasıl oluşturacağınızı Kullanım Kılavuzundan öğrenin](USAGE_GUIDE_TR.md#gorsel-efektler)

### Görsel Düzen Kurucu (Visual Layout Builder)

Karmaşık dashboard ızgaralarını hücreleri sürükleyip birleştirerek tasarlayın — koda gerek yok. **Ayarlar → Special Callouts → Visual Layout Builder** üzerinden erişin.

![Görsel Düzenleyici Ayarları](assets/visual_builder_settings.png)
> [Visual Layout Builder'ı nasıl kullanacağınızı Kullanım Kılavuzundan öğrenin](USAGE_GUIDE_TR.md#1-görsel-düzenleyici-visual-layout-builder)

### Dashboard Izgaraları (Grid Layouts)

Görsel düzenleyiciyi veya satır içi ızgara sözdizimini kullanarak çok panelli düzenler oluşturun. Callout'lar, tasarladığınız birleştirilmiş alanlara otomatik olarak yerleştirilir.

![Gelişmiş Dashboard Izgarası](assets/ultimate_dashboard.png)
> [Çoklu Callout Dashboard Izgaralarını nasıl oluşturacağınızı Kullanım Kılavuzundan öğrenin](USAGE_GUIDE_TR.md#grid-duzeni-multi-callout)

### Tipografi ve Kenarlıklar

![Tipografi ve Fontlar](assets/typography_fonts.png)
> [Fontları ve boyutlarını nasıl değiştireceğinizi Kullanım Kılavuzundan öğrenin](USAGE_GUIDE_TR.md#tipografi)

![Kenarlık Stilleri](assets/border_styles.png)
> [Kenarlıkları ve köşe yuvarlamayı nasıl özelleştireceğinizi Kullanım Kılavuzundan öğrenin](USAGE_GUIDE_TR.md#kenarliklar-ve-sekiller)

### Çok Sütunlu Listeler

![Standart Sütunlar](assets/standard_columns.png)
> [Listeleri nasıl çoklu sütunlara böleceğinizi Kullanım Kılavuzundan öğrenin](USAGE_GUIDE_TR.md#cok-sutunlu-listeler)

---

## Metadata Referansı

`> [!type] (param:deger, param2:deger2) Başlık`

### Renkler
| Parametre | Örnek | Açıklama |
| :--- | :--- | :--- |
| `bg` | `bg:#ff0000` | Arka plan rengi |
| `text` | `text:white` | İçerik metni rengi |
| `title` | `title:cyan` | Başlık ve ikon rengi |
| `link` | `link:orange` | Bağlantı (link) rengi |
| `gradient` | `gradient:blue-purple` | İki renkli degrade |
| `neon` | `neon:#00f2ff` | Neon kenarlık + parlama |
| `icon` | `icon:sun` | Lucide ikon adı |
| `icon-color` | `icon-color:cyan` | İkon rengi (varsayılan: başlık rengi) |
| `no-icon` | `(no-icon)` | İkonu gizle |

### Kenarlıklar
| Parametre | Örnek | Açıklama |
| :--- | :--- | :--- |
| `border` | `border:red` | Kenarlık rengi |
| `border-width` | `border-width:4` | Kalınlık (px) — kısası `bw:` |
| `border-style` | `border-style:dashed` | `solid`, `dashed`, `dotted`, `double` — kısası `bs:` |
| `radius` | `radius:20` | Köşe yuvarlaklığı (px) |

### Tipografi
| Parametre | Örnek | Açıklama |
| :--- | :--- | :--- |
| `font` | `font:mono` | `mono`, `serif`, `sans`, `hand`, `marker` |
| `font-size` | `font-size:4` | `1` (küçük) → `5` (büyük) |

### Düzen (Layout)
| Parametre | Örnek | Açıklama |
| :--- | :--- | :--- |
| `col` | `(col:3)` | Çok sütunlu listeler |
| `center` | `(center)` | İçeriği ortala |
| `compact` | `(compact)` | Dolguyu (padding) azalt |
| `dense` | `(dense)` | Compact'a ek olarak satır aralığını da kısar |
| Izgara | `(1:2)` | Izgaradaki konumu |

Tam referans için [Kullanım Kılavuzu'na](USAGE_GUIDE_TR.md) göz atın.

---

## AI Agent Skill

Callout'ları Claude'a yazdırın. **[skills/special-callouts/](skills/special-callouts/)**, eklentinin
tüm sözdizimini ve gerçek render davranışını anlatan bir
[Agent Skill](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview) — dokümantasyondan
değil, doğrudan v1.0.9 kaynak kodundan çıkarıldı.

Klasörü skill dizininize kopyalamanız yeterli:

```bash
cp -r skills/special-callouts ~/.claude/skills/
```

Sonrası basit: ne istediğinizi anlatın — "günlük notumun başına açık görevlerimi gösteren bir
dashboard kur", "bu listeyi üç sütuna böl", "callout arka planım neden bu kadar soluk?" — tahmine
dayalı değil, çalışan markdown üretsin.

| Dosya | İçerik |
| :--- | :--- |
| [`SKILL.md`](skills/special-callouts/SKILL.md) | Sözdizimi kuralları, geçerli sözdizimini bozuk gösteren tuzaklar, hata ayıklama listesi |
| [`references/parameters.md`](skills/special-callouts/references/parameters.md) | Her parametre: kabul edilen değerler, alias'lar, renk çözümleme, uç durumlar |
| [`references/layouts.md`](skills/special-callouts/references/layouts.md) | Çok sütunlu listeler, ızgaralar, görsel düzenler, Dataview |
| [`references/recipes.md`](skills/special-callouts/references/recipes.md) | Hazır kalıplar ve test edilmiş renk çiftleri |
| [`references/internals.md`](skills/special-callouts/references/internals.md) | Render hattı, DOM/CSS sözleşmesi, ayar şeması, bilinen hatalar |

Claude Code, Claude Desktop ve Claude.ai ile çalışır. `SKILL.md` düz markdown olduğu için sistem
promptu kabul eden her agent altyapısında da kullanılabilir.

---

## Kurulum

### Topluluk Eklentileri (Önerilen)

1. **Ayarlar → Topluluk Eklentileri**
2. Güvenli Mod'u (Restricted Mode) kapatın
3. Gözat → **Special Callouts** aratın
4. Yükle → Etkinleştir

Veya doğrudan açın: [community.obsidian.md/plugins/special-callouts](https://community.obsidian.md/plugins/special-callouts)

### Manuel

1. [En son sürümden](https://github.com/ahseyg/special-callouts/releases) `main.js`, `styles.css`, `manifest.json` dosyalarını indirin
2. `VaultKlasorunuz/.obsidian/plugins/special-callouts/` klasörü oluşturun
3. İndirdiğiniz dosyaları klasöre kopyalayın
4. Ayarlar → Topluluk Eklentileri kısmından etkinleştirin

---

## Katkıda Bulunma

- **Hata bildirimi:** [Bir sorun açın](https://github.com/ahseyg/special-callouts/issues) — Obsidian sürümünü, kullandığınız markdown kodunu ve bir ekran görüntüsünü ekleyin
- **Özellik istekleri:** [Bir sorun açın](https://github.com/ahseyg/special-callouts/issues)
- **Kod katkısı (PR):** Fork → Branch → Code → PR

Eğer bu eklentiyi faydalı bulduysanız, Github üzerinde [yıldız vermeyi](https://github.com/ahseyg/special-callouts) düşünebilirsiniz.

---

## Lisans

MIT — Ayrıntılar için [LICENSE](LICENSE) dosyasına bakın.

---
<p align="center">
  Geliştirici: <a href="https://github.com/ahseyg">ahseyg</a>
</p>
