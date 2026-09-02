# -*- coding: utf-8 -*-
"""
Builds Jawad-Hamza-Portfolio.pdf — the print companion to index.html.
Same identity: ink ground, amber accent, register structure.
    python build_pdf.py
"""
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph,
                                Spacer, Image, Table, TableStyle, KeepTogether,
                                PageBreak, Flowable, NextPageTemplate)
from PIL import Image as PILImage

HERE = os.path.dirname(os.path.abspath(__file__))
IMG  = os.path.join(HERE, "assets", "img")
OUT  = os.path.join(HERE, "Jawad-Hamza-Portfolio.pdf")

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
INK      = colors.HexColor("#0E1014")
INK_2    = colors.HexColor("#171B22")
PAPER    = colors.HexColor("#FFFFFF")
PAPER_2  = colors.HexColor("#F3F4F6")
TEXT     = colors.HexColor("#14161C")
DIM      = colors.HexColor("#3A3F49")
MUTED    = colors.HexColor("#666D78")
FAINT    = colors.HexColor("#98A0AA")
LINE     = colors.HexColor("#D6DAE0")
AMBER    = colors.HexColor("#B87A08")
AMBER_LT = colors.HexColor("#E0A21C")
LIVE     = colors.HexColor("#2F6D5B")
VIOLET   = colors.HexColor("#4F4E93")

PW, PH = A4
M_L, M_R, M_T, M_B = 18*mm, 18*mm, 20*mm, 18*mm
CW = PW - M_L - M_R                      # content width


def hx(c):
    """reportlab colour -> '#rrggbb' for <font color=...> markup."""
    return "#" + c.hexval()[2:]

# ---------------------------------------------------------------- styles
def S(name, **kw):
    base = dict(name=name, fontName="Body", fontSize=9.4, leading=14.2,
                textColor=DIM, alignment=TA_LEFT, spaceBefore=0, spaceAfter=0)
    base.update(kw)
    return ParagraphStyle(**base)

st_h1      = S("h1", fontName="Disp", fontSize=30, leading=30, textColor=TEXT, spaceAfter=6)
st_h2      = S("h2", fontName="Disp", fontSize=19, leading=21, textColor=TEXT, spaceAfter=5)
st_h3      = S("h3", fontName="Disp", fontSize=12.4, leading=15, textColor=TEXT, spaceAfter=3)
st_h4      = S("h4", fontName="Semi", fontSize=10, leading=13, textColor=TEXT, spaceAfter=2)
st_body    = S("body")
st_lede    = S("lede", fontSize=11, leading=17, textColor=DIM)
st_intro   = S("intro", fontSize=9.6, leading=14.6, textColor=MUTED)
st_small   = S("small", fontSize=8.6, leading=13, textColor=DIM)
st_eyebrow = S("eyebrow", fontName="MonoB", fontSize=6.6, leading=9, textColor=AMBER)
st_label   = S("label", fontName="Mono", fontSize=6.4, leading=9, textColor=FAINT)
st_cap     = S("cap", fontName="Mono", fontSize=6.2, leading=8.6, textColor=MUTED)
st_chip    = S("chip", fontName="Mono", fontSize=6.6, leading=9.6, textColor=MUTED)
st_bullet  = S("bullet", fontSize=9.2, leading=13.8, textColor=DIM,
               leftIndent=9, bulletIndent=0, spaceAfter=2.4)
st_specv   = S("specv", fontSize=8.8, leading=12.8, textColor=DIM)

# ---------------------------------------------------------------- helpers
class Rule(Flowable):
    """A hairline, optionally accented."""
    def __init__(self, width, color=LINE, thickness=0.6, space=0):
        Flowable.__init__(self)
        self.width, self.color, self.thickness, self.space = width, color, thickness, space
        self.height = thickness + space
    def draw(self):
        self.canv.setStrokeColor(self.color)
        self.canv.setLineWidth(self.thickness)
        self.canv.line(0, self.space, self.width, self.space)


class Stamp(Flowable):
    """Status stamp + site code, drawn as one row."""
    def __init__(self, text, code="", color=LIVE, width=CW):
        Flowable.__init__(self)
        self.text, self.code, self.color, self.width = text.upper(), code.upper(), color, width
        self.height = 12
    def draw(self):
        c = self.canv
        c.setFont("MonoB", 6.2)
        tw = c.stringWidth(self.text, "MonoB", 6.2)
        c.setStrokeColor(self.color); c.setLineWidth(0.6)
        c.setFillColor(colors.Color(self.color.red, self.color.green, self.color.blue, alpha=0.09))
        c.rect(0, 0, tw + 10, 11, stroke=1, fill=1)
        c.setFillColor(self.color)
        c.drawString(5, 3.4, self.text)
        if self.code:
            c.setFont("Mono", 6.2); c.setFillColor(FAINT)
            c.drawString(tw + 17, 3.4, self.code)


def eyebrow(text, color=AMBER):
    return Paragraph('<font face="MonoB" color="%s">%s</font>'
                     % (hx(color), text.upper()), st_eyebrow)


def chips(items, width=CW):
    """Stack chips into a compact mono line."""
    return Paragraph(
        '<font face="Mono" size="6.8" color="%s">%s</font>'
        % (hx(MUTED), "  ·  ".join(items)), st_chip)


def spec(rows, width=CW):
    data = [[Paragraph(k.upper(), st_label), Paragraph(v, st_specv)] for k, v in rows]
    t = Table(data, colWidths=[22*mm, width - 22*mm])
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 2.4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2.4),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))
    return t


def _img(name, width):
    path = os.path.join(IMG, name + ".jpg")
    if not os.path.exists(path):
        return None
    w, h = PILImage.open(path).size
    return Image(path, width=width, height=width * h / w)


def shot(name, caption, width=CW, keep=True):
    """A framed screenshot with a mono caption underneath.

    keep=False returns the bare table — KeepTogether must never go inside a
    table cell, since its height measures as infinite there.
    """
    im = _img(name, width)
    if im is None:
        return Spacer(1, 0)
    t = Table([[im], [Paragraph(caption.upper(), st_cap)]], colWidths=[width])
    t.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.6, LINE),
        ("LINEABOVE", (0, 1), (0, 1), 0.6, LINE),
        ("BACKGROUND", (0, 1), (0, 1), PAPER_2),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (0, 0), 0),
        ("BOTTOMPADDING", (0, 0), (0, 0), 0),
        ("LEFTPADDING", (0, 1), (0, 1), 5),
        ("TOPPADDING", (0, 1), (0, 1), 3.5),
        ("BOTTOMPADDING", (0, 1), (0, 1), 3.5),
    ]))
    return KeepTogether(t) if keep else t


def shot_row(pairs, width=CW, gap=4*mm):
    """Two or three screenshots side by side."""
    n = len(pairs)
    cw = (width - gap * (n - 1)) / n
    cells = [shot(nm, cap, cw, keep=False) for nm, cap in pairs]
    row, cols = [], []
    for i, c in enumerate(cells):
        row.append(c); cols.append(cw)
        if i < n - 1:
            row.append(Spacer(gap, 1)); cols.append(gap)
    t = Table([row], colWidths=cols)
    t.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"),
                           ("LEFTPADDING", (0, 0), (-1, -1), 0),
                           ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                           ("TOPPADDING", (0, 0), (-1, -1), 0),
                           ("BOTTOMPADDING", (0, 0), (-1, -1), 0)]))
    return KeepTogether(t)


def modmap(title, count, mods, width=CW, cols=4):
    """Module grid for systems whose UI needs SQL Server to boot."""
    head = Table([[Paragraph(title.upper(), st_label),
                   Paragraph('<para align="right">%s</para>' % count.upper(), st_label)]],
                 colWidths=[width * 0.6 - 10, width * 0.4 - 10])
    head.setStyle(TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 0),
                              ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                              ("BOTTOMPADDING", (0, 0), (-1, -1), 6)]))
    grid, row = [], []
    for m in mods:
        if isinstance(m, tuple):
            cell = Paragraph('<font face="Mono" size="7" color="%s">%s</font><br/>'
                             '<font face="Mono" size="5.6" color="%s">%s</font>'
                             % (hx(DIM), m[0], hx(FAINT), m[1].upper()), st_body)
        else:
            cell = Paragraph('<font face="Mono" size="7" color="%s">%s</font>'
                             % (hx(DIM), m), st_body)
        row.append(cell)
        if len(row) == cols:
            grid.append(row); row = []
    if row:
        row += [""] * (cols - len(row))
        grid.append(row)

    inner_w = width - 20
    g = Table(grid, colWidths=[inner_w / cols] * cols)
    g.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E4E7EC")),
        ("BACKGROUND", (0, 0), (-1, -1), PAPER_2),
        ("TOPPADDING", (0, 0), (-1, -1), 4.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4.5),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
    ]))
    box = Table([[head], [g]], colWidths=[width])
    box.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.6, LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (0, 0), 9),
        ("BOTTOMPADDING", (0, 1), (0, 1), 10),
        ("TOPPADDING", (0, 1), (0, 1), 0),
    ]))
    return KeepTogether(box)


def section(letter, title, intro):
    return [
        Spacer(1, 2*mm),
        eyebrow("Register %s" % letter),
        Spacer(1, 1.5*mm),
        Paragraph(title, st_h2),
        Paragraph(intro, st_intro),
        Spacer(1, 2*mm),
        Rule(CW, AMBER_LT, 0.9),
        Spacer(1, 5*mm),
    ]


def record(stamp_text, code, stamp_color, name, blurb, rows, tech):
    return [
        Stamp(stamp_text, code, stamp_color),
        Spacer(1, 2.5*mm),
        Paragraph(name, st_h3),
        Paragraph(blurb, st_body),
        Spacer(1, 3*mm),
        spec(rows),
        Spacer(1, 2.5*mm),
        chips(tech),
        Spacer(1, 4*mm),
    ]


def bullets(items):
    return [Paragraph(i, st_bullet, bulletText="\u2013") for i in items]


# ---------------------------------------------------------------- page furniture
class Doc(BaseDocTemplate):
    def __init__(self, path):
        BaseDocTemplate.__init__(self, path, pagesize=A4,
                                 leftMargin=M_L, rightMargin=M_R,
                                 topMargin=M_T, bottomMargin=M_B,
                                 title="Jawad Hamza — Deployment Register",
                                 author="Jawad Hamza",
                                 subject="Software development portfolio")
        frame = Frame(M_L, M_B, CW, PH - M_T - M_B, id="main",
                      leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
        self.addPageTemplates([
            PageTemplate(id="cover", frames=[Frame(0, PH - 6, PW, 5, id="cov",
                         leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)],
                         onPage=draw_cover),
            PageTemplate(id="content", frames=[frame], onPage=self._content_bg),
        ])

    def _content_bg(self, c, doc):
        c.setFillColor(PAPER); c.rect(0, 0, PW, PH, stroke=0, fill=1)
        # running header
        c.setStrokeColor(LINE); c.setLineWidth(0.6)
        c.line(M_L, PH - M_T + 7*mm, PW - M_R, PH - M_T + 7*mm)
        c.setFont("MonoB", 6.2); c.setFillColor(TEXT)
        c.drawString(M_L, PH - M_T + 9.5*mm, "JAWAD HAMZA")
        c.setFont("Mono", 6.2); c.setFillColor(FAINT)
        c.drawString(M_L + 27*mm, PH - M_T + 9.5*mm, "DEPLOYMENT REGISTER")
        c.setFillColor(AMBER)
        c.drawRightString(PW - M_R, PH - M_T + 9.5*mm, "%02d" % doc.page)
        # footer
        c.setFont("Mono", 5.8); c.setFillColor(FAINT)
        c.drawString(M_L, M_B - 8*mm, "jawwadhamzas@gmail.com   ·   +92 312 0892388")
        c.drawRightString(PW - M_R, M_B - 8*mm, "MIRPUR, AZAD KASHMIR")


def draw_cover(c, doc):
    """The whole cover is drawn onto the page; nothing flows into it."""
    c.setFillColor(INK); c.rect(0, 0, PW, PH, stroke=0, fill=1)

    x = M_L
    # eyebrow
    c.setFont("MonoB", 7); c.setFillColor(AMBER_LT)
    c.drawString(x, PH - 34*mm, "SOFTWARE DEVELOPER")
    c.setFont("Mono", 7); c.setFillColor(colors.HexColor("#868D97"))
    c.drawRightString(PW - M_R, PH - 34*mm, "MIRPUR, AZAD KASHMIR")
    c.setStrokeColor(colors.HexColor("#262C36")); c.setLineWidth(0.6)
    c.line(x + 42*mm, PH - 35.2*mm, PW - M_R - 46*mm, PH - 35.2*mm)

    # name
    c.setFillColor(colors.HexColor("#E9E7E2"))
    c.setFont("Disp", 46)
    c.drawString(x, PH - 60*mm, "JAWAD")
    c.drawString(x, PH - 76*mm, "HAMZA")

    # thesis
    c.setFont("Body", 13); c.setFillColor(colors.HexColor("#B4B7BC"))
    c.drawString(x, PH - 92*mm, "I build the systems people")
    c.setFillColor(AMBER_LT); c.setFont("BodyB", 13)
    c.drawString(x, PH - 99.5*mm, "run their day on.")

    # portrait
    pp = os.path.join(IMG, "portrait.jpg")
    if os.path.exists(pp):
        pw_ = 44*mm
        c.setFillColor(INK_2)
        c.rect(PW - M_R - pw_ - 3*mm, PH - 100*mm - 3*mm, pw_ + 6*mm, pw_ + 6*mm, stroke=0, fill=1)
        c.drawImage(pp, PW - M_R - pw_, PH - 100*mm, pw_, pw_,
                    preserveAspectRatio=True, anchor="n", mask="auto")

    # body copy
    c.setFont("Body", 9.6); c.setFillColor(colors.HexColor("#868D97"))
    lines = [
        "Blood banks, hospital wards, restaurant counters, retail tills, genetics labs.",
        "Not demos — working software deployed into live operations, where a wrong stock",
        "figure loses money and a mislabelled blood bag is a clinical incident.",
    ]
    yy = PH - 118*mm
    for ln in lines:
        c.drawString(x, yy, ln); yy -= 5.6*mm

    # register index
    c.setStrokeColor(colors.HexColor("#262C36")); c.setLineWidth(0.6)
    c.line(x, 104*mm, PW - M_R, 104*mm)
    idx = [("A", "Systems in production"), ("B", "Platforms & applied AI"),
           ("C", "Web, product & brand"),  ("D", "Media & video production"),
           ("E", "Foundations & learning lab"), ("F", "Record")]
    yy = 97*mm
    for k, v in idx:
        c.setFont("MonoB", 7); c.setFillColor(AMBER_LT)
        c.drawString(x, yy, "REGISTER " + k)
        c.setFont("Body", 9); c.setFillColor(colors.HexColor("#B4B7BC"))
        c.drawString(x + 26*mm, yy, v)
        c.setStrokeColor(colors.HexColor("#1E232B")); c.setLineWidth(0.5)
        c.line(x, yy - 2.6*mm, PW - M_R, yy - 2.6*mm)
        yy -= 7.4*mm

    # contact block
    c.setFont("Mono", 7.4); c.setFillColor(colors.HexColor("#E9E7E2"))
    c.drawString(x, 22*mm, "jawwadhamzas@gmail.com")
    c.drawString(x, 17*mm, "+92 312 0892388")
    c.setFillColor(colors.HexColor("#5B626C")); c.setFont("Mono", 6.4)
    c.drawRightString(PW - M_R, 17*mm, "PORTFOLIO 2026")


# ---------------------------------------------------------------- content
def build():
    doc = Doc(OUT)
    # page 1 is the drawn cover; everything after it uses the content template
    F = [NextPageTemplate("content"), PageBreak()]

    # ============================================== PROFILE
    F += [eyebrow("Profile"), Spacer(1, 2*mm),
          Paragraph("Software developer, forward deployed", st_h2),
          Spacer(1, 1*mm), Rule(CW, AMBER_LT, 0.9), Spacer(1, 5*mm)]

    prose = [
        "I am a software developer based in <b>Mirpur, Azad Kashmir</b>, with two years of freelance "
        "delivery and a year running operations and project management inside a software house. Most of "
        "my work is <b>line-of-business software for organisations that cannot afford it to be wrong</b> "
        "— a blood centre, a district hospital, a university genetics lab, a shop floor.",

        "That context shapes how I build. I work close to the people who will use the system, which is "
        "why my current role at the Regional Blood Centre is a <b>forward deployed</b> one: the "
        "requirements live in the departmental manuals and in what the technician actually does at the "
        "bench, not in a specification document. It also means I care about the unglamorous parts — "
        "audit trails, expiry alerts, double-entry that reconciles, backups that restore.",

        "My primary stack is <b>Python and Django</b>, extended by ASP.NET Core and C# for the .NET "
        "estates I have worked in, and Next.js and TypeScript where the front end carries real weight. "
        "I work fluently with <b>generative and agentic AI tooling</b> — Claude Code and OpenAI's Codex "
        "— as part of how I ship, and I build self-hosted AI infrastructure so institutions keep their "
        "own data. Before software I trained as a video editor and designer, which is still how I think "
        "about interfaces.",
    ]

    port = _img("portrait-studio", 46*mm)
    prose_cell = []
    for p in prose:
        prose_cell += [Paragraph(p, st_body), Spacer(1, 3*mm)]
    intro_t = Table([[prose_cell, port]], colWidths=[CW - 52*mm, 52*mm])
    intro_t.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"),
                                 ("LEFTPADDING", (0, 0), (0, 0), 0),
                                 ("RIGHTPADDING", (0, 0), (0, 0), 6*mm),
                                 ("LEFTPADDING", (1, 0), (1, 0), 0),
                                 ("RIGHTPADDING", (1, 0), (1, 0), 0),
                                 ("TOPPADDING", (0, 0), (-1, -1), 0)]))
    F += [intro_t, Spacer(1, 5*mm)]

    # ledger strip
    led = [["SYSTEMS BUILT", "LIVE DEPLOYMENTS", "PRIMARY STACKS", "ALSO DELIVERS"],
           ["20+", "4", "3", "2"],
           ["Operational platforms,\nweb products, AI tooling",
            "Blood centre, hospital,\ngenetics lab, retail floor",
            "Django · ASP.NET Core\nNext.js / TypeScript",
            "Brand identity systems\nand video production"]]
    led_rows = [
        [Paragraph(x, st_label) for x in led[0]],
        [Paragraph('<font face="Disp" size="17" color="%s">%s</font>' % (hx(TEXT), x), st_body)
         for x in led[1]],
        [Paragraph(x.replace("\n", "<br/>"), st_cap) for x in led[2]],
    ]
    lt = Table(led_rows, colWidths=[CW / 4.0] * 4)
    lt.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BACKGROUND", (0, 0), (-1, -1), PAPER_2),
        ("BOX", (0, 0), (-1, -1), 0.6, LINE),
        ("LINEAFTER", (0, 0), (-2, -1), 0.5, LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, 0), 8),
        ("TOPPADDING", (0, 1), (-1, 1), 4),
        ("BOTTOMPADDING", (0, 2), (-1, 2), 8),
    ]))
    F += [lt, PageBreak()]

    # ============================================== REGISTER A
    F += section("A", "Systems in production",
                 "Software that other people depend on to do their job. Each entry lists where it runs "
                 "and which modules actually shipped. Screenshots are captured from the running "
                 "application, not from mockups.")

    F += record("In production", "RBC · Mirpur AJK", LIVE,
                "Blood Bank Management System",
                "End-to-end traceability for a regional blood centre: from donor registration and "
                "mobilisation drives, through collection, serological screening and component "
                "processing, to cross-matched issue at the ward. Every bag carries an audit trail from "
                "the arm it came from to the patient it reached.",
                [("Deployed", "Regional Blood Centre (RBC), Mirpur, Azad Kashmir"),
                 ("Role", "Forward deployed engineer &amp; developer"),
                 ("Built to", "The centre's departmental manuals — mobilisation, collection, medical "
                              "officer, processing, serology, distribution, and the blood bank KPI set")],
                ["ASP.NET Core 8 MVC", "C#", "Entity Framework Core", "SQL Server", "Razor"])
    F += [modmap("Shipped modules", "11 controllers", [
        ("Donors", "Registry & eligibility"), ("Donations", "Collection events"),
        ("Blood Bags", "Inventory & expiry"), ("Blood Test Reports", "Serology screening"),
        ("Transfusions", "Issue & cross-match"), ("Patients", "Recipient records"),
        ("Administration", "Users & roles"), ("Audit Logs", "Chain of custody"),
        ("Modules", "Feature control"), ("Account", "Authentication"),
        ("Home", "Operations dashboard"), ("", ""),
    ]), PageBreak()]

    F += record("In production", "QAU · Genetics", LIVE,
                "Neurogenetics Research LIMS",
                "A laboratory information management system for translational genetics. Families are "
                "modelled as real pedigrees — individuals, relationships, probands — so a sample is "
                "never just a barcode but a person inside an inheritance pattern. Tracks samples "
                "through extraction and sequencing, records variants against a disorder dictionary, "
                "and exports family data for analysis.",
                [("Built for", "Genetics labs, Quaid-e-Azam University · originally commissioned by "
                               "Prof. Sundas Farooq"),
                 ("Core", "Pedigree graph, sample workflow states, variant calls, stored file vault, "
                          "disorder reference"),
                 ("Notable", "Interactive pedigree renderer driven from live relationship data")],
                ["Django", "Python", "MySQL", "Class-based views", "Custom auth model"])
    F += [shot("lims-dashboard", "Laboratory overview · sample workflow", CW*0.82), Spacer(1, 4*mm),
          shot_row([("lims-families", "Family register · pedigrees"),
                    ("lims-samples", "Sample tracking"),
                    ("lims-disorders", "Disorder dictionary")]),
          PageBreak()]

    F += record("In production", "DHQ · Mirpur AJK", LIVE,
                "DHQ Hospital Management System",
                "Contributed to the hospital-wide information system for the District Headquarters "
                "Hospital — a multi-area ASP.NET application covering the clinical, diagnostic, "
                "pharmacy and finance sides of the hospital under one roof.",
                [("Deployed", "DHQ Hospital, Mirpur, Azad Kashmir"),
                 ("Role", "Contributing developer — backend and data layer"),
                 ("Scale", "18 functional areas across clinical, diagnostic and financial operations")],
                ["ASP.NET MVC", "C#", "MS SQL Server", "Areas architecture"])
    F += [modmap("Functional areas", "18 modules",
                 ["Dashboard", "Appointments", "Doctor", "Patient History",
                  "Vital", "Specimen", "Labs", "Medicine",
                  "Pharmacy", "Accounts", "Finance", "Individual Package",
                  "Working Sessions", "Performance", "Building", "Country",
                  "Province & City", "Configuration"], cols=4),
          Spacer(1, 6*mm)]

    F += record("Pilot / SaaS", "Vendora", AMBER,
                "Vendora — POS, Inventory &amp; Accounts",
                "A retail platform that refuses to separate the till from the books. Barcode checkout, "
                "purchase orders, expenses and party ledgers all post into one double-entry accounting "
                "core, so the trial balance and profit &amp; loss are generated from actual sales rather "
                "than re-keyed at month end. GST is applied automatically from the product category "
                "matrix and locked from settings so cashiers cannot drift the tax.",
                [("Built for", "Grocery, pharmacy, electronics and garment retailers"),
                 ("Accounting", "Trial balance · profit &amp; loss · balance sheet · account ledgers · "
                                "party statements"),
                 ("Operations", "POS checkout, stock control, purchases, expenses, multi-user roles, "
                                "backups")],
                ["Django", "Python", "SQLite / PostgreSQL", "Thermal receipts", "Barcode scanning"])
    F += [PageBreak(),
          shot("pos-screen", "POS checkout · scan, cart, GST", CW*0.82), Spacer(1, 4*mm),
          shot_row([("pos-dashboard", "Operations dashboard"),
                    ("pos-trial-balance", "Trial balance · double entry"),
                    ("pos-profit-loss", "Profit & loss statement")]), Spacer(1, 4*mm),
          shot_row([("pos-products", "Product catalogue & stock"),
                    ("pos-reports", "Reports centre"),
                    ("pos-purchases", "Purchases & suppliers")]),
          PageBreak()]

    F += record("Delivered", "RMS", MUTED,
                "Restaurant Management System",
                "Front of house and back office in one system. A touch-first order screen handles "
                "dine-in, takeaway and delivery, fires KOTs straight to a kitchen display, and settles "
                "against table state — while the back office keeps recipes, inventory depletion, staff "
                "shifts, purchases and the accounts ledger in step behind it.",
                [("Front of house", "Order screen, bill list, kitchen queue, table map, fast cash"),
                 ("Back office", "Menu &amp; categories, inventory, staff, purchases, expenses, "
                                 "accounts, reports"),
                 ("Interface", "Built for touchscreen terminals and a separate kitchen display")],
                ["Django", "Django REST Framework", "Python", "SQLite", "KDS"])
    F += [shot("rms-pos", "Order screen · dine-in / takeaway / delivery", CW*0.82), Spacer(1, 4*mm),
          shot_row([("rms-kitchen", "Kitchen display · KOT queue"),
                    ("rms-tables", "Table map & service state"),
                    ("rms-accounts", "Accounts & ledgers")]),
          PageBreak()]

    # ============================================== REGISTER B
    F += section("B", "Platforms &amp; applied AI",
                 "Self-hosted, provider-neutral AI infrastructure and agent systems — built so an "
                 "institution keeps its own data on its own hardware. Retrieval pipelines, multi-agent "
                 "orchestration, and speech systems that run against local models.")

    F += record("In development", "Store Listen", VIOLET,
                "Store Listen — Retail Conversation Intelligence",
                "Records in-store customer conversations, transcribes and translates them live across "
                "English, Spanish, French and Urdu, and turns them into coaching for the shop owner. A "
                "slang vocabulary teaches the system how customers actually talk; compliance rules "
                "attach a dollar value to every missed action. All text is PII-redacted before it "
                "reaches a model.",
                [("Engines", "Browser Web Speech API for instant words, or chunked cloud STT for any "
                             "browser"),
                 ("Security", "Provider keys AES-256-GCM encrypted at rest, never returned to the "
                              "browser"),
                 ("Output", "Live coaching, owner dashboard, daily report, custom metrics and flags")],
                ["Next.js 16", "React 19", "TypeScript", "Zod contracts", "SQLite", "Gemini / OpenAI / Ollama"])
    F += [modmap("Workspace boundaries", "Monorepo", [
        ("apps/web", "Recorder, dashboard, reports"), ("apps/api", "Auth, providers, persistence"),
        ("packages/contracts", "Versioned Zod schemas"), ("Vocabulary", "Slang & mis-hearing map"),
        ("Compliance rules", "Trigger → expected action"), ("Analytics rules", "Guidelines, metrics, flags"),
    ], cols=3), Spacer(1, 6*mm)]

    F += record("In development", "Nexus AI", VIOLET,
                "Nexus AI — Market Impact Intelligence",
                "An OSINT monitoring grid that ingests open-source event feeds, classifies them, and "
                "forecasts market impact across macro, crypto and foreign exchange. Built as a Django "
                "event engine behind a Next.js intelligence dashboard with live regime read-outs and "
                "alerting.",
                [("Pipeline", "Feed ingest → event engine → classifier → analytics → impact forecast"),
                 ("Surface", "Intelligence, Markets, Alerts and Settings workspaces")],
                ["Django", "Next.js", "Recharts", "Tailwind", "Python classifiers"])
    F += [shot("nexus-clean", "Intelligence grid · market regime", CW*0.82), PageBreak()]

    small_b = [
        ("In development", "University AI", VIOLET, "University AI",
         "Self-hostable, provider-neutral AI platform for university communities. A modular monolith — "
         "API, web portal and worker deploy independently while Postgres, Redis and inference stay "
         "replaceable. Persisted RBAC, streaming chat through an Ollama gateway, audit records and a "
         "containerised local stack.",
         ["FastAPI", "PostgreSQL", "Redis", "Docker Compose", "Ollama", "RBAC"]),
        ("In development", "Local AI Platform", VIOLET, "Private RAG Platform",
         "A production-oriented, self-hosted ChatGPT alternative for private infrastructure. "
         "Admin-managed knowledge bases with document chunking and pgvector embedding, similarity "
         "search with source citations, per-user file uploads, project workspaces and an audit "
         "dashboard.",
         ["FastAPI", "pgvector", "Celery", "SSE streaming", "Next.js 14", "Alembic"]),
        ("In development", "IdeaFlow", VIOLET, "IdeaFlow",
         "A living project-memory platform. Capture unstructured thoughts, let an LLM extract intent "
         "and entities, connect them to existing project knowledge, and detect conflicts before a "
         "decision is silently overwritten — then generate architecture, flowcharts, roadmaps and "
         "execution-ready prompts traceable back to source.",
         ["Next.js App Router", "FastAPI", "Supabase", "pgvector", "RLS policies"]),
        ("Delivered", "AURA", MUTED, "AURA — Desktop AI Operating System",
         "A Jarvis-inspired multi-agent desktop assistant. A supervisor agent routes every request; "
         "knowledge and execution agents parse strict JSON intent through local Ollama models and "
         "launch real tools for files, browser and applications, with durable memory across sessions.",
         ["Python", "PyQt6", "Ollama", "Multi-agent", "Qwen 2.5"]),
        ("Delivered", "Jarvis Voice", MUTED, "Jarvis Voice Control",
         "A Windows voice assistant with a deliberately closed command set — it will not run arbitrary "
         "shell commands. Speech recognition runs in a local browser page; a Node server drives the "
         "PC; a local Qwen model decides whether to run a safe command, open a search, ask for "
         "clarification, or simply answer.",
         ["Node.js", "Web Speech API", "Ollama", "PowerShell"]),
        ("Delivered", "Flow Factory", MUTED, "Codex n8n Flow Factory",
         "A workshop that lets a coding agent author n8n workflows as versioned JSON, validate them "
         "against known-good templates, map credentials, and import them into a self-hosted n8n "
         "workspace as inactive drafts — so the last human step is pressing Execute.",
         ["Node.js", "n8n public API", "JSON schema validation", "PowerShell GUI"]),
        ("Delivered", "ToolVerse", MUTED, "ToolVerse",
         "60+ free utility tools for documents, business, images, data, colour and text — every one "
         "running entirely in the browser. No uploads, no signup, no tracking: files never leave the "
         "device. Installable as a PWA.",
         ["Client-side only", "PWA", "PDF & DOCX processing", "MIT"]),
        ("Delivered", "WakeForce", MUTED, "WakeForce — Android",
         "A mission-based alarm app for Android. Alarms are dismissed by completing missions rather "
         "than tapping snooze, with progress rings, streak statistics and an emergency override path. "
         "Built natively in Kotlin with Jetpack Compose and instrumented UI tests.",
         ["Kotlin", "Jetpack Compose", "MVVM", "Gradle KTS", "Compose UI tests"]),
    ]
    for stext, code, col, name, blurb, tech in small_b:
        F += [Stamp(stext, code, col), Spacer(1, 2.5*mm),
              Paragraph(name, st_h3), Paragraph(blurb, st_body), Spacer(1, 2*mm),
              chips(tech), Spacer(1, 2*mm), Rule(CW, LINE, 0.5), Spacer(1, 4*mm)]

    F += [PageBreak()]

    # ============================================== REGISTER C
    F += section("C", "Web, product &amp; brand",
                 "Marketing sites, WordPress themes, product interfaces and full identity systems — "
                 "from logo grid and colour spec through to the shipped, responsive build.")

    F += record("Live", "FutureSpace", LIVE, "FutureSpace",
                "The digital home of the software house where I ran delivery — a React/Vite site with a "
                "particle-driven hero, a courses and club programme, an activity feed and a "
                "global-reach section, shipped alongside a matching WordPress theme. Rebuilt and QA'd "
                "down to 360&nbsp;px across every page.",
                [("Scope", "Site architecture, front-end build, WordPress theme, responsive QA"),
                 ("Sections", "Home, Services, Courses, Club, Activity, About, Team, Contact")],
                ["React", "Vite", "TypeScript", "WordPress theme", "Vercel"])
    F += [shot("futurespace", "Homepage · particle hero", CW*0.82), Spacer(1, 4*mm),
          shot_row([("fs-home", "Programme sections"), ("fs-global", "Global reach"),
                    ("fs-contact", "Contact · Mirpur studio")]),
          PageBreak()]

    F += record("Delivered", "Apex Unify", MUTED, "Apex Unify",
                "A full brand and web system for an all-in-one tech and creative agency: identity, "
                "animated logo, marketing site and a customised WordPress theme covering ten service "
                "lines from brand design through AI assistants and cyber security.",
                [("Delivered", "Identity, animated mark, site design and build, WordPress theme package")],
                ["HTML / CSS / JS", "WordPress", "Brand identity", "Motion"])
    F += [shot("apex-preview", "Homepage · unified delivery", CW*0.82), Spacer(1, 5*mm)]

    F += record("Concept build", "Jinnah Motors", MUTED, "Rent-A-Car Management",
                "A fleet operations console for a Rawalpindi rent-a-car business: bookings, vehicle "
                "calendar, drivers, expenses, profit reports, and — the part that matters locally — "
                "token tax and document expiry alerts before a vehicle is stopped at a checkpoint.",
                [("Focus", "Fleet availability, daily closing, PKR profit reporting, document alerts")],
                ["HTML / CSS / JS", "Dashboard UX", "PKR reporting"])
    F += [shot("rentacar", "Fleet operations console", CW*0.82), PageBreak()]

    small_c = [
        ("Delivered", "DevCore", "DevCore",
         "Agency site for Star Solutions built on a WebGL particle field with GSAP scroll "
         "choreography — three.js background, scroll-triggered reveals, and a restrained type system "
         "holding it all together.",
         ["Three.js", "GSAP ScrollTrigger", "WebGL"], "devcore-2", "WebGL particle field"),
        ("Delivered", "ZEHNOX", "ZEHNOX Identity System",
         "A complete brand identity — primary mark, logo variants, colour and typography "
         "specification, a ten-page identity guide, motion treatment and a documented website "
         "structure under the line \u201cFrom Mind to World\u201d.",
         ["Adobe Illustrator", "Photoshop", "Identity guide", "Motion"], "zehnox-identity",
         "Identity guide"),
        ("Delivered", "Blood Drive", "Blood Donation Campaign Sites",
         "Two public-facing campaign front-ends for blood donation drives — donor sign-up, "
         "eligibility guidance and drive information, designed to be readable on a phone at a camp "
         "table.",
         ["HTML / CSS / JS", "Responsive"], "blood-demo", "Campaign front-end"),
        ("Delivered", "Havenworks", "Havenworks Redesign",
         "A structural redesign of a dense news and content site — rebuilding an overloaded page into "
         "a clear reading hierarchy without losing the breadth of content the original carried.",
         ["Information architecture", "HTML / CSS"], "amna-news", "Redesigned reading hierarchy"),
    ]
    for stext, code, name, blurb, tech, im, cap in small_c:
        block = [Stamp(stext, code, MUTED), Spacer(1, 2.5*mm),
                 Paragraph(name, st_h3), Paragraph(blurb, st_body), Spacer(1, 2*mm),
                 chips(tech), Spacer(1, 3*mm), shot(im, cap, CW * 0.62), Spacer(1, 5*mm)]
        F += [KeepTogether(block)]

    F += [PageBreak()]

    # ============================================== REGISTER D
    F += section("D", "Media &amp; video production",
                 "Alongside the engineering: commercial video editing sold through Fiverr and Upwork, "
                 "client campaign work, and the product films that accompany the systems above.")
    media = [
        ("Client work", "Campaigns", "Client Campaign Editing",
         "Multi-cut campaign delivery for international clients — regional edits, music and no-music "
         "variants, vertical reels and HD masters, turned around against short deadlines.",
         ["Adobe Premiere Pro", "After Effects", "CapCut", "Colour & sound"]),
        ("Product film", "Systems", "Product Walkthrough Films",
         "Screen-recorded walkthroughs for the restaurant, inventory, POS and laboratory systems — "
         "used as client demos and onboarding material for staff who will use the software daily.",
         ["Screen capture", "Motion graphics", "Voice-over edit"]),
        ("Documentary", "Long form", "Long-Form &amp; Documentary Edits",
         "Narrative business documentary work and long-form storytelling pieces, cut for pacing and "
         "argument rather than montage.",
         ["Narrative editing", "Archive footage", "Sound design"]),
    ]
    for stext, code, name, blurb, tech in media:
        F += [Stamp(stext, code, MUTED), Spacer(1, 2.5*mm),
              Paragraph(name, st_h3), Paragraph(blurb, st_body), Spacer(1, 2*mm),
              chips(tech), Spacer(1, 2*mm), Rule(CW, LINE, 0.5), Spacer(1, 4*mm)]

    # ============================================== REGISTER E
    F += [Spacer(1, 4*mm)]
    F += section("E", "Foundations &amp; the learning lab",
                 "A working directory of deliberate practice — the place where a stack gets learned "
                 "properly before it goes anywhere near a client.")
    lab = [
        ("Full stack", "chatbot", "Embeddable RAG Chatbot Platform",
         "The most complete piece in the lab: a containerised support-chat product with a FastAPI "
         "backend, Alembic migrations, a React admin dashboard, and a standalone embeddable widget "
         "built as its own bundle — the full shape of a SaaS product in miniature.",
         ["FastAPI", "PostgreSQL", "Alembic", "Docker Compose", "Vite", "nginx"]),
        ("Computer vision", "poki", "Body-Pose Game Controller",
         "A Chrome extension that turns webcam body tracking into keyboard input, so browser games "
         "are played by moving rather than typing.",
         ["Chrome extension MV3", "Pose detection", "JavaScript"]),
        ("Visualisation", "coding maths", "Mathematics in Motion",
         "Canvas experiments that render mathematical behaviour as animation rather than notation — "
         "built to develop intuition for the geometry underneath graphics and simulation code.",
         ["Canvas API", "JavaScript", "Numerical methods"]),
        ("Practice", "Ai / tensorflow", "Embeddings, Vector Search &amp; TensorFlow",
         "Ground-level work on the machinery behind the AI platforms above: building embeddings by "
         "hand, implementing vector similarity search, LangChain pipelines, local Llama inference, "
         "and a TensorFlow environment for model training.",
         ["TensorFlow", "LangChain", "Embeddings", "Vector search", "Ollama"]),
        ("Practice", "MERN / fast", "MERN &amp; FastAPI Fundamentals",
         "Deliberate practice across the two stacks that carry most of the production work — React "
         "with Vite on the front, FastAPI services on the back, built from an empty folder each time "
         "rather than from a generator.",
         ["React", "Vite", "FastAPI", "Node"]),
        ("Practice", "C / cpp / cypher", "Systems &amp; Cryptography Basics",
         "C and C++ from first principles, plus a cipher workshop implementing classical encryption "
         "schemes with a browser front-end — the low-level counterweight to a mostly high-level stack.",
         ["C", "C++", "Python", "Classical ciphers"]),
    ]
    for stext, code, name, blurb, tech in lab:
        F += [Stamp(stext, code, VIOLET), Spacer(1, 2.5*mm),
              Paragraph(name, st_h3), Paragraph(blurb, st_body), Spacer(1, 2*mm),
              chips(tech), Spacer(1, 2*mm), Rule(CW, LINE, 0.5), Spacer(1, 4*mm)]

    F += [PageBreak()]

    # ============================================== REGISTER F
    F += section("F", "Record",
                 "Experience, education and capability behind the systems above.")

    exp = [
        ("Current", "Forward Deployed Engineer &amp; Developer",
         "Regional Blood Centre (RBC) · Mirpur, Azad Kashmir",
         ["Building and deploying the blood bank management system on site, working directly with "
          "collection, serology, processing and distribution staff.",
          "Concurrently developing the laboratory system for the genetics labs of Quaid-e-Azam "
          "University."]),
        ("Oct 2025 — Jul 2026", "Operational Manager &amp; Project Manager",
         "FutureSpace, A Software House · Mirpur, Azad Kashmir",
         ["Managed multiple software projects from inception to completion, owning timelines, budgets "
          "and quality assurance.",
          "Led cross-functional teams and introduced agile practices to the delivery process."]),
        ("Sep — Dec 2025", "Technical Associate",
         "Network &amp; Telecom Centre, MUST University",
         ["Backend and full-stack development in Python with a strong focus on Django; also worked "
          "within ASP.NET MVC architecture.",
          "Database design and management across MS SQL and MySQL.",
          "Collaborated with cross-functional teams to keep network services running without "
          "interruption."]),
        ("2024 — present", "Freelance Software Developer",
         "Independent · Fiverr, Upwork &amp; direct clients",
         ["Designed and built a neurological lab management system in Django for Prof. Sundas Farooq.",
          "Delivered a restaurant management system and an inventory / point-of-sale platform.",
          "Contributed to the DHQ Hospital Management System in Mirpur, Azad Kashmir.",
          "Built websites and brand systems for multiple clients, and sold video editing projects "
          "internationally."]),
    ]
    F += [eyebrow("Experience"), Spacer(1, 3*mm)]
    for when, role, org, items in exp:
        cell = [Paragraph(role, st_h4),
                Paragraph('<font face="Mono" size="7" color="%s">%s</font>'
                          % (hx(AMBER), org), st_body),
                Spacer(1, 2*mm)] + bullets(items)
        t = Table([[Paragraph(when.upper(), st_label), cell]], colWidths=[32*mm, CW - 32*mm])
        t.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"),
                               ("LEFTPADDING", (0, 0), (-1, -1), 0),
                               ("RIGHTPADDING", (0, 0), (0, 0), 6*mm),
                               ("TOPPADDING", (0, 0), (-1, -1), 4),
                               ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                               ("LINEABOVE", (0, 0), (-1, 0), 0.5, LINE)]))
        F += [KeepTogether(t)]

    F += [Spacer(1, 6*mm), eyebrow("Education"), Spacer(1, 3*mm)]
    for when, role, org, items in [
        ("Expected 2030", "BSc Computer Science", "Virtual University · Mirpur, Azad Kashmir",
         ["In progress alongside full-time development work."]),
        ("Completing Oct 2026", "Google Data Science &amp; AI Program", "Coursera",
         ["Applied data science and machine learning foundations."]),
    ]:
        cell = [Paragraph(role, st_h4),
                Paragraph('<font face="Mono" size="7" color="%s">%s</font>'
                          % (hx(AMBER), org), st_body),
                Spacer(1, 2*mm)] + bullets(items)
        t = Table([[Paragraph(when.upper(), st_label), cell]], colWidths=[32*mm, CW - 32*mm])
        t.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"),
                               ("LEFTPADDING", (0, 0), (-1, -1), 0),
                               ("RIGHTPADDING", (0, 0), (0, 0), 6*mm),
                               ("TOPPADDING", (0, 0), (-1, -1), 4),
                               ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                               ("LINEABOVE", (0, 0), (-1, 0), 0.5, LINE)]))
        F += [KeepTogether(t)]

    F += [PageBreak(), eyebrow("Capability"), Spacer(1, 3*mm)]
    skills = [
        ("Languages", ["Python", "C#", "JavaScript & TypeScript", "Kotlin", "SQL", "C / C++",
                       "HTML & CSS"]),
        ("Frameworks", ["Django & Django REST", "FastAPI · Flask", "ASP.NET Core MVC · EF Core",
                        "Next.js · React", "Jetpack Compose", "Tailwind CSS"]),
        ("Data & infrastructure", ["PostgreSQL & pgvector", "MS SQL Server · MySQL", "Redis · Celery",
                                   "Docker & Compose", "Alembic migrations",
                                   "NumPy · Pandas · Matplotlib"]),
        ("AI engineering", ["RAG pipelines & vector search", "Self-hosted Ollama deployment",
                            "Multi-agent orchestration", "Speech-to-text & translation",
                            "Claude Code · OpenAI Codex", "TensorFlow · LangChain"]),
        ("Design & media", ["Brand identity systems", "Adobe Illustrator & Photoshop",
                            "Premiere Pro · After Effects", "CapCut",
                            "Interface & interaction design"]),
        ("Working practice", ["Forward deployed delivery", "Project & operations management",
                              "Agile team leadership", "Requirements from the field",
                              "Client communication"]),
    ]
    cells = []
    for title, items in skills:
        body = [Paragraph(title.upper(), st_eyebrow), Spacer(1, 2*mm)]
        for it in items:
            body.append(Paragraph(it, st_small))
        cells.append(body)
    rows = [cells[i:i + 3] for i in range(0, len(cells), 3)]
    sk = Table(rows, colWidths=[CW / 3.0] * 3)
    sk.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.5, LINE),
        ("BACKGROUND", (0, 0), (-1, -1), PAPER_2),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
    ]))
    F += [sk, Spacer(1, 10*mm)]

    # contact
    F += [Rule(CW, AMBER_LT, 0.9), Spacer(1, 5*mm),
          Paragraph("Let's put something into production.", st_h2), Spacer(1, 2*mm),
          Paragraph("Available for software development roles, forward deployed engagements, and "
                    "freelance system builds. Based in Azad Kashmir, working with clients "
                    "internationally.", st_intro), Spacer(1, 5*mm)]
    ct = [("Email", "jawwadhamzas@gmail.com"),
          ("Phone", "+92 312 0892388"),
          ("Location", "Basement Ghosia Mosque, Mirpur, Azad Kashmir 10250"),
          ("References", "Available on request")]
    ctt = Table([[Paragraph(k.upper(), st_label),
                  Paragraph('<font face="Mono" size="8.4" color="%s">%s</font>'
                            % (hx(TEXT), v), st_body)] for k, v in ct],
                colWidths=[30*mm, CW - 30*mm])
    ctt.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                             ("LEFTPADDING", (0, 0), (-1, -1), 0),
                             ("TOPPADDING", (0, 0), (-1, -1), 6),
                             ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                             ("LINEBELOW", (0, 0), (-1, -1), 0.5, LINE)]))
    F += [ctt]

    doc.build(F)


if __name__ == "__main__":
    build()
    print("wrote", OUT, os.path.getsize(OUT) // 1024, "KB")
