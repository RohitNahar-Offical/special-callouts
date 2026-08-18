# Special Callouts — Agent Skill

[English](README.md) · [Eklenti README](../../README_TR.md)

Bir yapay zekâ asistanına Obsidian
[Special Callouts](https://github.com/ahseyg/special-callouts) eklentisinin (v1.0.8) tüm
sözdizimini ve gerçek render davranışını öğreten bir
[Agent Skill](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview).

Bu skill yüklüyken bir agent, Special Callouts markdown'ını ilk denemede doğru yazabilir —
stillendirilmiş callout'lar, çok sütunlu listeler, dashboard ızgaraları, Dataview panelleri — ve
beklendiği gibi görünmeyen callout'ları teşhis edebilir. Kullanıcının eklentiyi anlatmasına gerek
kalmaz.

## İçerik

| Dosya | İçerik |
|---|---|
| `SKILL.md` | Temel sözdizimi, geçerli sözdizimini bozuk gösteren tuzaklar, kompozisyon, ızgaralar, hata ayıklama listesi |
| `references/parameters.md` | Her parametre: kabul edilen değerler, alias'lar, renk çözümleme, parametre bazlı uç durumlar |
| `references/layouts.md` | Çok sütunlu listeler, `multi-callout` ızgaraları, görsel düzenler, Dataview entegrasyonu |
| `references/recipes.md` | Hazır kalıplar — terminal, istatistik kutuları, takip listeleri, dashboard'lar — ve test edilmiş renk çiftleri |
| `references/internals.md` | Render hattı, DOM/CSS sözleşmesi, ayar şeması, komutlar, bilinen hatalar |

Referans dosyaları yalnızca görev gerektirdiğinde yüklenir; sıradan istekler bu sayede hafif kalır.

İçerik, eklentinin dokümantasyonundan değil **v1.0.8 kaynak kodundan** (parser, processor ve
stylesheet) çıkarıldı. İkisinin çeliştiği yerlerde skill, kodun gerçekte ne yaptığını yazar ve
çelişkiyi ayrıca işaretler.

## Kurulum

**Claude Code** — klasörü iki konumdan birine kopyalamanız yeterli, otomatik algılanır:

```bash
cp -r special-callouts ~/.claude/skills/
```

```bash
cp -r special-callouts .claude/skills/
```

İlki tüm projelerde, ikincisi yalnızca o projede geçerli olur.

**Claude.ai / Claude Desktop** — `special-callouts` klasörünü zip'leyip
Ayarlar → Capabilities → Skills altından yükleyin.

**Diğer agent altyapıları** — `SKILL.md`, YAML frontmatter'lı düz markdown. Sistem promptuna
yapıştırabilir veya altyapınızın skill yükleyicisini bu dizine yönlendirebilirsiniz.

## Kullanım

Ayrıca bir komut çalıştırmanız gerekmez. Skill, eklentinin adı hiç geçmese bile Obsidian
callout'larıyla ilgili isteklerde devreye girer:

- "bu nottaki uyarı kutusunu koyu yap, kırmızı parlasın"
- "günlük notumun başına açık görevlerimi gösteren bir dashboard kur"
- "bu listeyi üç sütuna böl"
- "callout arka planım neden bu kadar soluk çıkıyor?"

## Uyumluluk

Special Callouts **v1.0.8** için yazıldı. Parametre sözdizimi 1.0.3'ten beri kararlı;
`internals.md` en hızlı eskiyecek bölüm, çünkü uygulama detaylarını ve açık hataları belgeliyor.

## Lisans

Eklentiyle aynı: MIT.
