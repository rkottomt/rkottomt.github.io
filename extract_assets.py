"""
One-time asset extraction for the project galleries.

Pulls the embedded photos out of `portfolio images.pdf`, renders a high-res
copy of the AJAS poster, and extracts the individual poster figures (heatmap,
LSTM regression, etc.) into assets/projects/. Also prints the on-page bounding
box of each poster figure as a percentage of the page so the clickable hotspot
coordinates in home.js stay accurate.

Run:  python extract_assets.py
Requires PyMuPDF (fitz).
"""
import os
import fitz

OUT = os.path.join("assets", "projects")
os.makedirs(OUT, exist_ok=True)

PORTFOLIO = "portfolio images.pdf"
POSTER = "Rohit Kottomtharayil - AJAS Poster 2025.pdf"


def save_xref(doc, xref, path):
    """Save an embedded image (by xref) to disk, flattening alpha if needed."""
    pix = fitz.Pixmap(doc, xref)
    if pix.n - pix.alpha >= 4:  # CMYK or similar -> convert to RGB
        pix = fitz.Pixmap(fitz.csRGB, pix)
    pix.save(path)
    print("  wrote", path, pix.width, "x", pix.height)


def extract_portfolio():
    doc = fitz.open(PORTFOLIO)
    # xref -> filename (mapping determined from caption text + page order)
    mapping = {
        5: "nokia-rf.jpg",         # Nokia Bell Labs - RF waveform splitter pack
        7: "airquality-fair.jpg",  # Urban Air Quality - Delaware Valley Science Fair
        10: "beehive-sensors.jpg", # Beehive - Arduino sensor array
        11: "beehive-farm.jpg",    # Beehive - field-ready device
        14: "pfizer-nyc.jpg",      # Pfizer - NYC branch
        17: "pfizer-interns.jpg",  # Pfizer - fellow interns
    }
    print("portfolio images.pdf:")
    for xref, name in mapping.items():
        save_xref(doc, xref, os.path.join(OUT, name))
    doc.close()


def extract_poster():
    doc = fitz.open(POSTER)
    page = doc[0]
    pw, ph = page.rect.width, page.rect.height

    # High-res full poster render for the zoomable overview.
    mat = fitz.Matrix(2, 2)
    pix = page.get_pixmap(matrix=mat)
    full_path = os.path.join(OUT, "poster-full.png")
    pix.save(full_path)
    print("poster full render:", full_path, pix.width, "x", pix.height)

    # xref -> (filename, human label) for the figures we want to zoom into.
    figures = {
        17: ("fig-heatmap.png", "Feature-selection correlation heatmap"),
        19: ("fig-pairplot.png", "Feature-selection pairplot"),
        22: ("fig-cloud-pressure.png", "Average cloud-top pressure (Jan-Feb 2024)"),
        16: ("fig-lstm-regression.png", "LSTM sample regression (Mumbai 2023)"),
        18: ("fig-rmse.png", "Regression model RMSE (Mumbai 2019-2023)"),
    }
    print("poster figures + hotspot percentages:")
    for xref, (name, label) in figures.items():
        save_xref(doc, xref, os.path.join(OUT, name))
        rects = page.get_image_rects(xref)
        if rects:
            r = rects[0]
            left = 100 * r.x0 / pw
            top = 100 * r.y0 / ph
            w = 100 * (r.x1 - r.x0) / pw
            h = 100 * (r.y1 - r.y0) / ph
            print(
                "    {} -> left {:.2f}% top {:.2f}% w {:.2f}% h {:.2f}%  ({})".format(
                    name, left, top, w, h, label
                )
            )
    doc.close()


if __name__ == "__main__":
    extract_portfolio()
    extract_poster()
    print("done")
