# -*- coding: utf-8 -*-
"""
build_project_pdfs.py — one self-contained case-study PDF per major project,
sized and laid out for a Fiverr gig gallery.

Fiverr shows page 1 as the thumbnail, so page 1 is a full-bleed dark cover.
Each file stays a few MB, well inside Fiverr's 15 MB per-PDF limit.

Data comes from assets/data.json, exported from assets/data.js, so the PDFs,
the website and the main portfolio never drift apart.

    node -e "...export data.json..."      # see README
    python build_project_pdfs.py
"""
import json, os, re
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer,
                                Image, Table, TableStyle, KeepTogether, PageBreak,
                                Flowable, NextPageTemplate)
from PIL import Image as PILImage

HERE = os.path.dirname(os.path.abspath(__file__))
IMG  = os.path.join(HERE, "assets", "img")
OUT  = os.path.join(HERE, "fiverr")
DATA = json.load(open(os.path.join(HERE, "assets", "data.json"), encoding="utf-8"))
PROJECTS = {p["id"]: p for p in DATA["PROJECTS"]}
STATUS, DOMAINS = DATA["STATUS"], DATA["DOMAINS"]

# ---------------------------------------------------------------- fonts
WF = r"C:\Windows\Fonts"
pdfmetrics.registerFont(TTFont("Disp",  os.path.join(WF, "seguibl.ttf")))
pdfmetrics.registerFont(TTFont("Semi",  os.path.join(WF, "segoeuib.ttf")))
pdfmetrics.registerFont(TTFont("Body",  os.path.join(WF, "georgia.ttf")))
pdfmetrics.registerFont(TTFont("BodyB", os.path.join(WF, "georgiab.ttf")))
pdfmetrics.registerFont(TTFont("BodyI", os.path.join(WF, "georgiai.ttf")))
pdfmetrics.registerFont(TTFont("Mono",  os.path.join(WF, "consola.ttf")))
pdfmetrics.registerFont(TTFont("MonoB", os.path.join(WF, "consolab.ttf")))
pdfmetrics.registerFontFamily("Body", normal="Body", bold="BodyB", italic="BodyI")

# ---------------------------------------------------------------- palette
INK      = colors.HexColor("#0B0D10")
INK_2    = colors.HexColor("#151A21")
PAPER    = colors.HexColor("#FFFFFF")
PAPER_2  = colors.HexColor("#F3F4F6")
TEXT     = colors.HexColor("#12141A")
DIM      = colors.HexColor("#363B45")
MUTED    = colors.HexColor("#646B76")
FAINT    = colors.HexColor("#98A0AA")
LINE     = colors.HexColor("#D5D9E0")
AMBER    = colors.HexColor("#B07A08")
AMBER_LT = colors.HexColor("#E8A317")
LIVE     = colors.HexColor("#2F6D5B")
VIOLET   = colors.HexColor("#4F4E93")
GREY     = colors.HexColor("#646B76")
ON_INK   = colors.HexColor("#EFEDE8")
ON_INK_2 = colors.HexColor("#98A0AA")

TONE = {"live": LIVE, "amber": AMBER, "violet": VIOLET, "grey": GREY}
TONE_ON_INK = {"live": colors.HexColor("#54B294"), "amber": AMBER_LT,
               "violet": colors.HexColor("#8F8DDA"), "grey": colors.HexColor("#8A919B")}

PW, PH = A4
M = 16 * mm
CW = PW - 2 * M

CONTACT = "jawwadhamzas@gmail.com   ·   +92 312 0892388   ·   Mirpur, Azad Kashmir"

hx = lambda c: "#" + c.hexval()[2:]


def clean(s):
    """Project copy is HTML; make it safe for reportlab's mini-parser."""
    s = str(s).replace("&nbsp;", "&#160;")
    s = s.replace("“", "&#8220;").replace("”", "&#8221;")
    return s


def plain(s):
    """Strip markup entirely — for canvas drawString."""
    s = re.sub(r"<[^>]+>", "", str(s))
    return (s.replace("&amp;", "&").replace("&nbsp;", " ")
             .replace("&#160;", " ").replace("“", '"').replace("”", '"'))


# ---------------------------------------------------------------- styles
def S(name, **kw):
    base = dict(name=name, fontName="Body", fontSize=9.6, leading=14.6,
                textColor=DIM, alignment=TA_LEFT)
    base.update(kw); return ParagraphStyle(**base)

st_h2    = S("h2", fontName="Disp", fontSize=17, leading=19, textColor=TEXT, spaceAfter=5)
st_h3    = S("h3", fontName="Semi", fontSize=11, leading=14, textColor=TEXT, spaceAfter=3)
st_body  = S("body")
st_lede  = S("lede", fontSize=11.2, leading=17.4, textColor=DIM)
st_small = S("small", fontSize=8.8, leading=13.4, textColor=DIM)
st_label = S("label", fontName="Mono", fontSize=6.4, leading=9.2, textColor=FAINT)
st_cap   = S("cap", fontName="Mono", fontSize=6.4, leading=9, textColor=MUTED)
st_eye   = S("eye", fontName="MonoB", fontSize=6.8, leading=9.6, textColor=AMBER)
st_bul   = S("bul", fontSize=9.5, leading=14.2, textColor=DIM, leftIndent=10, spaceAfter=3)


class Rule(Flowable):
    def __init__(self, width, color=LINE, thickness=0.7):
        Flowable.__init__(self); self.width = width; self.color = color
        self.thickness = thickness; self.height = thickness
    def draw(self):
        self.canv.setStrokeColor(self.color); self.canv.setLineWidth(self.thickness)
        self.canv.line(0, 0, self.width, 0)


class Stamp(Flowable):
    def __init__(self, text, code="", color=LIVE):
        Flowable.__init__(self)
        self.text = text.upper(); self.code = code.upper(); self.color = color
        self.height = 13
    def draw(self):
        c = self.canv
        c.setFont("MonoB", 6.4)
        tw = c.stringWidth(self.text, "MonoB", 6.4)
        c.setStrokeColor(self.color); c.setLineWidth(0.7)
        c.setFillColor(colors.Color(self.color.red, self.color.green, self.color.blue, alpha=.09))
        c.rect(0, 0, tw + 11, 12, stroke=1, fill=1)
        c.setFillColor(self.color); c.drawString(5.5, 3.8, self.text)
        if self.code:
            c.setFont("Mono", 6.4); c.setFillColor(FAINT)
            c.drawString(tw + 18, 3.8, self.code)


def eyebrow(t, color=AMBER):
    return Paragraph('<font face="MonoB" color="%s">%s</font>' % (hx(color), t.upper()), st_eye)


def spec_table(rows, width=CW):
    data = [[Paragraph(k.upper(), st_label), Paragraph(clean(v), st_small)] for k, v in rows]
    t = Table(data, colWidths=[26 * mm, width - 26 * mm])
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("LINEBELOW", (0, 0), (-1, -2), 0.4, LINE),
    ]))
    return t


def chips(items, width=CW):
    return Paragraph('<font face="Mono" size="7.2" color="%s">%s</font>'
                     % (hx(MUTED), "   ·   ".join(plain(i) for i in items)), st_cap)


def _img(name_or_path, width):
    path = name_or_path if os.path.isabs(name_or_path) else os.path.join(HERE, name_or_path)
    if not os.path.exists(path):
        return None, 0
    w, h = PILImage.open(path).size
    return Image(path, width=width, height=width * h / w), width * h / w


def shot_block(src, caption, width=CW, keep=True):
    im, _ = _img(src, width)
    if im is None:
        return Spacer(1, 0)
    t = Table([[im], [Paragraph(plain(caption).upper(), st_cap)]], colWidths=[width])
    t.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.7, LINE),
        ("LINEABOVE", (0, 1), (0, 1), 0.7, LINE),
        ("BACKGROUND", (0, 1), (0, 1), PAPER_2),
        ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (0, 0), 0), ("BOTTOMPADDING", (0, 0), (0, 0), 0),
        ("LEFTPADDING", (0, 1), (0, 1), 6),
        ("TOPPADDING", (0, 1), (0, 1), 4), ("BOTTOMPADDING", (0, 1), (0, 1), 4),
    ]))
    return KeepTogether(t) if keep else t


def shot_row(pairs, width=CW, gap=4 * mm):
    n = len(pairs); cw = (width - gap * (n - 1)) / n
    row, cols = [], []
    for i, (src, cap) in enumerate(pairs):
        row.append(shot_block(src, cap, cw, keep=False)); cols.append(cw)
        if i < n - 1: row.append(Spacer(gap, 1)); cols.append(gap)
    t = Table([row], colWidths=cols)
    t.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"),
                           ("LEFTPADDING", (0, 0), (-1, -1), 0),
                           ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                           ("TOPPADDING", (0, 0), (-1, -1), 0),
                           ("BOTTOMPADDING", (0, 0), (-1, -1), 0)]))
    return KeepTogether(t)


def modmap(title, count, items, cols=3, width=CW):
    head = Table([[Paragraph(plain(title).upper(), st_label),
                   Paragraph('<para align="right">%s</para>' % plain(count).upper(), st_label)]],
                 colWidths=[width * .55 - 10, width * .45 - 10])
    head.setStyle(TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 0),
                              ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                              ("BOTTOMPADDING", (0, 0), (-1, -1), 7)]))
    grid, row = [], []
    for it in items:
        name = it[0]; sub = it[1] if len(it) > 1 else ""
        cell = Paragraph('<font face="Mono" size="7.4" color="%s">%s</font>%s'
                         % (hx(DIM), plain(name),
                            ('<br/><font face="Mono" size="5.8" color="%s">%s</font>'
                             % (hx(FAINT), plain(sub).upper())) if sub else ""), st_body)
        row.append(cell)
        if len(row) == cols: grid.append(row); row = []
    if row: row += [""] * (cols - len(row)); grid.append(row)
    inner = width - 20
    g = Table(grid, colWidths=[inner / cols] * cols)
    g.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"),
                           ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E6E9EE")),
                           ("BACKGROUND", (0, 0), (-1, -1), PAPER_2),
                           ("TOPPADDING", (0, 0), (-1, -1), 5),
                           ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                           ("LEFTPADDING", (0, 0), (-1, -1), 6)]))
    box = Table([[head], [g]], colWidths=[width])
    box.setStyle(TableStyle([("BOX", (0, 0), (-1, -1), 0.7, LINE),
                             ("LEFTPADDING", (0, 0), (-1, -1), 10),
                             ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                             ("TOPPADDING", (0, 0), (0, 0), 9),
                             ("TOPPADDING", (0, 1), (0, 1), 0),
                             ("BOTTOMPADDING", (0, 1), (0, 1), 10)]))
    return KeepTogether(box)


# ------------------------------------------------------ what I can build
SERVICES = {
    "health": ("Healthcare & laboratory software", [
        "Blood bank, laboratory and hospital information systems with full audit trails.",
        "Sample and specimen tracking from intake through result, with status workflows.",
        "Role-based access, chain-of-custody logging and printable clinical reports.",
        "Migration of paper registers and spreadsheets into a real database."]),
    "retail":  ("Retail, POS & inventory software", [
        "Point-of-sale with barcode scanning, thermal receipts and offline-tolerant checkout.",
        "Inventory, purchase orders, suppliers, expiry alerts and low-stock reporting.",
        "Double-entry accounting: trial balance, profit & loss, ledgers and party statements.",
        "Tax handling wired to product categories so staff cannot drift the rate."]),
    "ai":      ("Applied AI & automation", [
        "Self-hosted AI platforms so your data never leaves your own infrastructure.",
        "Retrieval pipelines (RAG) over your documents with cited, checkable answers.",
        "Speech-to-text, live translation and conversation analysis.",
        "Multi-agent tooling and workflow automation around existing systems."]),
    "web":     ("Websites, themes & brand systems", [
        "Fast, responsive marketing sites built to hold up down to 360 px.",
        "Custom WordPress themes packaged and ready for hand-off.",
        "Full brand identity: logo system, colour and type spec, usage guide.",
        "Interactive front-end work — WebGL, scroll choreography, motion."]),
    "mobile":  ("Android application development", [
        "Native Android apps in Kotlin with Jetpack Compose.",
        "MVVM architecture, local persistence and instrumented UI tests.",
        "Background work, alarms, notifications and permissions handled properly."]),
    "media":   ("Video editing & production", [
        "Campaign edits with regional, music and no-music variants.",
        "Vertical reels and HD masters delivered to spec.",
        "Product walkthrough films and onboarding material for software."]),
    "learning": ("Custom software development", [
        "Full-stack builds in Django, FastAPI, Next.js and React.",
        "Dockerised deployment with migrations, workers and health checks.",
        "Clean handover: documentation, environment files and a working local setup."]),
}


# ---------------------------------------------------------------- document
class Doc(BaseDocTemplate):
    def __init__(self, path, project):
        self.project = project
        BaseDocTemplate.__init__(self, path, pagesize=A4,
                                 leftMargin=M, rightMargin=M, topMargin=20 * mm, bottomMargin=16 * mm,
                                 title="%s — Case Study | Jawad Hamza" % plain(project["name"]),
                                 author="Jawad Hamza",
                                 subject=plain(project["tag"]))
        frame = Frame(M, 16 * mm, CW, PH - 20 * mm - 16 * mm, id="main",
                      leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
        self.addPageTemplates([
            PageTemplate(id="cover",
                         frames=[Frame(0, PH - 6, PW, 5, id="c",
                                       leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)],
                         onPage=lambda c, d: draw_cover(c, project)),
            PageTemplate(id="content", frames=[frame], onPage=self._chrome),
        ])

    def _chrome(self, c, doc):
        c.setFillColor(PAPER); c.rect(0, 0, PW, PH, stroke=0, fill=1)
        c.setStrokeColor(LINE); c.setLineWidth(0.6)
        c.line(M, PH - 20 * mm + 7 * mm, PW - M, PH - 20 * mm + 7 * mm)
        c.setFont("MonoB", 6.4); c.setFillColor(TEXT)
        c.drawString(M, PH - 20 * mm + 9.6 * mm, "JAWAD HAMZA")
        c.setFont("Mono", 6.4); c.setFillColor(FAINT)
        name = plain(self.project["name"]).upper()
        c.drawString(M + 27 * mm, PH - 20 * mm + 9.6 * mm, name[:56])
        c.setFillColor(AMBER)
        c.drawRightString(PW - M, PH - 20 * mm + 9.6 * mm, "%02d" % doc.page)
        c.setFont("Mono", 6); c.setFillColor(FAINT)
        c.drawString(M, 16 * mm - 8 * mm, CONTACT)
        c.drawRightString(PW - M, 16 * mm - 8 * mm, "CASE STUDY")


def draw_cover(c, p):
    """Page 1 is the Fiverr thumbnail — it has to carry the whole pitch."""
    c.setFillColor(INK); c.rect(0, 0, PW, PH, stroke=0, fill=1)
    x = M
    tone = TONE_ON_INK[STATUS[p["status"]]["tone"]]

    # header rule
    c.setFont("MonoB", 7); c.setFillColor(AMBER_LT)
    c.drawString(x, PH - 18 * mm, "JAWAD HAMZA · CASE STUDY")
    c.setFont("Mono", 7); c.setFillColor(ON_INK_2)
    c.drawRightString(PW - M, PH - 18 * mm, plain(DOMAINS[p["domain"]]).upper())
    c.setStrokeColor(colors.HexColor("#232A34")); c.setLineWidth(0.7)
    c.line(x, PH - 20.5 * mm, PW - M, PH - 20.5 * mm)

    # status stamp
    label = STATUS[p["status"]]["label"].upper()
    c.setFont("MonoB", 6.6)
    tw = c.stringWidth(label, "MonoB", 6.6)
    c.setStrokeColor(tone); c.setLineWidth(0.8)
    c.rect(x, PH - 31 * mm, tw + 12, 13, stroke=1, fill=0)
    c.setFillColor(tone); c.drawString(x + 6, PH - 31 * mm + 4.2, label)
    c.setFont("Mono", 6.6); c.setFillColor(ON_INK_2)
    c.drawString(x + tw + 19, PH - 31 * mm + 4.2, plain(p["code"]).upper())

    # title — wrapped by hand so it can be set very large
    title = plain(p["name"]).upper()
    size = 40
    words, lines, cur = title.split(), [], ""
    maxw = CW
    while True:
        lines, cur = [], ""
        for w in words:
            t = (cur + " " + w).strip()
            if c.stringWidth(t, "Disp", size) <= maxw: cur = t
            else: lines.append(cur); cur = w
        if cur: lines.append(cur)
        if len(lines) <= 3 or size <= 20: break
        size -= 2
    y = PH - 46 * mm
    c.setFillColor(ON_INK); c.setFont("Disp", size)
    for ln in lines:
        c.drawString(x, y, ln); y -= size * 0.92

    # one-line pitch
    c.setFont("Body", 12); c.setFillColor(colors.HexColor("#B9BCC1"))
    tag = plain(p["tag"])
    ty = y - 6 * mm
    tl, tcur = [], ""
    for w in tag.split():
        t = (tcur + " " + w).strip()
        if c.stringWidth(t, "Body", 12) <= CW: tcur = t
        else: tl.append(tcur); tcur = w
    if tcur: tl.append(tcur)
    for ln in tl:
        c.drawString(x, ty, ln); ty -= 6 * mm

    # hero visual: first screenshot, else the module count.
    # The visual is centred in whatever vertical space the title left, so a
    # wide screenshot never strands a dead gap above the footer.
    img_top = ty - 8 * mm
    img_bottom = 34 * mm
    box_h = img_top - img_bottom
    if p["shots"]:
        src = os.path.join(HERE, p["shots"][0]["src"])
        if os.path.exists(src):
            iw, ih = PILImage.open(src).size
            cap_gap = 8 * mm
            avail = box_h - cap_gap
            w = CW; h = w * ih / iw
            if h > avail: h = avail; w = h * iw / ih
            ix = x + (CW - w) / 2
            iy = img_bottom + cap_gap + (avail - h) / 2
            c.setFillColor(INK_2)
            c.rect(ix - 3, iy - 3, w + 6, h + 6, stroke=0, fill=1)
            c.drawImage(src, ix, iy, w, h, mask="auto")
            c.setStrokeColor(colors.HexColor("#2C3340")); c.setLineWidth(0.7)
            c.rect(ix, iy, w, h, stroke=1, fill=0)
            c.setFont("Mono", 6.4); c.setFillColor(ON_INK_2)
            c.drawString(x, iy - 5.5 * mm, plain(p["shots"][0]["cap"]).upper()
                         + "   ·   CAPTURED FROM THE RUNNING APPLICATION")
    else:
        n = len(p["modules"]["items"]) if p.get("modules") else len(p["stack"])
        sub = "MODULES SHIPPED" if p.get("modules") else "TECHNOLOGIES"
        bh = min(box_h, 84 * mm)
        by = img_bottom + (box_h - bh) / 2
        c.setFillColor(INK_2); c.rect(x, by, CW, bh, stroke=0, fill=1)
        c.setFillColor(ON_INK); c.setFont("Disp", 76)
        c.drawCentredString(PW / 2, by + bh / 2 + 2, str(n))
        c.setFont("Mono", 8); c.setFillColor(AMBER_LT)
        c.drawCentredString(PW / 2, by + bh / 2 - 20, sub)
        # fill the rest of the plate with what those modules actually are
        if p.get("modules"):
            names = [plain(i[0]) for i in p["modules"]["items"]]
            c.setFont("Mono", 6.6); c.setFillColor(colors.HexColor("#7A828D"))
            line, ly = "", by + bh / 2 - 40
            for nm in names:
                t = (line + "   ·   " + nm).strip(" ·")
                if c.stringWidth(t, "Mono", 6.6) > CW - 24 * mm:
                    c.drawCentredString(PW / 2, ly, line); ly -= 4.2 * mm; line = nm
                else:
                    line = t
            if line: c.drawCentredString(PW / 2, ly, line)

    # footer
    c.setStrokeColor(colors.HexColor("#232A34")); c.setLineWidth(0.7)
    c.line(x, 26 * mm, PW - M, 26 * mm)
    c.setFont("Mono", 7.6); c.setFillColor(ON_INK)
    c.drawString(x, 19 * mm, "jawwadhamzas@gmail.com")
    c.drawString(x, 14 * mm, "+92 312 0892388")
    c.setFont("Mono", 6.6); c.setFillColor(colors.HexColor("#565D67"))
    c.drawRightString(PW - M, 14 * mm, "MIRPUR, AZAD KASHMIR · 2026")


# ---------------------------------------------------------------- builder
def build_one(pid):
    p = PROJECTS[pid]
    os.makedirs(OUT, exist_ok=True)
    slug = re.sub(r"[^A-Za-z0-9]+", "-", plain(p["name"])).strip("-")
    path = os.path.join(OUT, slug + ".pdf")
    doc = Doc(path, p)
    F = [NextPageTemplate("content"), PageBreak()]

    # ---- overview
    F += [eyebrow("The system"), Spacer(1, 2.5 * mm),
          Paragraph(plain(p["name"]), st_h2),
          Spacer(1, 1 * mm), Rule(CW, AMBER_LT, 1), Spacer(1, 5 * mm),
          Paragraph(clean(p["blurb"]), st_lede), Spacer(1, 6 * mm)]

    rows = [(k, v) for k, v in p["spec"]]
    rows.append(("Status", STATUS[p["status"]]["label"]))
    rows.append(("Field", DOMAINS[p["domain"]]))
    F += [spec_table(rows), Spacer(1, 6 * mm)]
    F += [eyebrow("Built with"), Spacer(1, 2.5 * mm), chips(p["stack"]), Spacer(1, 6 * mm)]

    if p.get("modules"):
        F += [modmap(p["modules"]["title"], p["modules"]["count"], p["modules"]["items"]),
              Spacer(1, 6 * mm)]

    # ---- screens
    shots = p["shots"]
    if shots:
        F += [PageBreak(), eyebrow("Screens"), Spacer(1, 2.5 * mm),
              Paragraph("From the running application", st_h2),
              Spacer(1, 1 * mm), Rule(CW, AMBER_LT, 1), Spacer(1, 5 * mm)]
        F += [shot_block(shots[0]["src"], shots[0]["cap"], CW * 0.88), Spacer(1, 5 * mm)]
        rest = shots[1:]
        for i in range(0, len(rest), 2):
            pair = rest[i:i + 2]
            if len(pair) == 2:
                F += [shot_row([(s["src"], s["cap"]) for s in pair]), Spacer(1, 4 * mm)]
            else:
                F += [shot_block(pair[0]["src"], pair[0]["cap"], CW * 0.62), Spacer(1, 4 * mm)]

    # ---- services + CTA
    title, bullets = SERVICES.get(p["domain"], SERVICES["learning"])
    F += [PageBreak(), eyebrow("Work with me"), Spacer(1, 2.5 * mm),
          Paragraph(title, st_h2), Spacer(1, 1 * mm), Rule(CW, AMBER_LT, 1), Spacer(1, 5 * mm),
          Paragraph("I build line-of-business software for organisations that cannot afford it "
                    "to be wrong. This project is one of 32 systems I have delivered; four are "
                    "running in daily production.", st_lede), Spacer(1, 5 * mm)]
    F += [Paragraph(b, st_bul, bulletText="\u2013") for b in bullets]
    F += [Spacer(1, 6 * mm), eyebrow("How I work"), Spacer(1, 2.5 * mm)]
    F += [Paragraph(b, st_bul, bulletText="\u2013") for b in [
        "I work close to the people who will use the system, not from a spec document alone.",
        "You get the source, the database schema, and a local setup that actually runs.",
        "Clear milestones, and a demo build you can click through at each one.",
    ]]

    F += [Spacer(1, 8 * mm), Rule(CW, AMBER_LT, 1), Spacer(1, 4 * mm)]
    ct = Table([[Paragraph('<font face="MonoB" size="7" color="%s">GET IN TOUCH</font>' % hx(AMBER), st_body),
                 Paragraph('<font face="Mono" size="9" color="%s">jawwadhamzas@gmail.com<br/>'
                           '+92 312 0892388</font>' % hx(TEXT), st_body)]],
               colWidths=[34 * mm, CW - 34 * mm])
    ct.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"),
                            ("LEFTPADDING", (0, 0), (-1, -1), 0),
                            ("TOPPADDING", (0, 0), (-1, -1), 4)]))
    F += [ct]

    doc.build(F)
    return path, os.path.getsize(path)


# the projects worth their own gig
GIGS = ["vendora", "rms", "lims", "bloodbank", "hmis",
        "listen", "nexus", "chatbot", "futurespace", "apex", "rentacar"]

if __name__ == "__main__":
    total = 0
    print("%-42s %8s  %s" % ("FILE", "SIZE", "PAGES"))
    print("-" * 68)
    import pypdf
    for pid in GIGS:
        path, size = build_one(pid)
        pages = len(pypdf.PdfReader(path).pages)
        total += size
        print("%-42s %6d KB  %d" % (os.path.basename(path), size // 1024, pages))
    print("-" * 68)
    print("%d files, %d KB total, in %s" % (len(GIGS), total // 1024, OUT))
