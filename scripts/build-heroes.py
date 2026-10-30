from pathlib import Path
from html import escape

OUT = Path(__file__).parent.parent / 'docs' / 'assets'
OUT.mkdir(parents=True, exist_ok=True)

def p(x, y, z=0):
    return (155 + .31*x + .24*z, 120 + .31*y - .16*z)

def pts(v):
    return ' '.join(f'{x:.2f},{y:.2f}' for x,y in v)

def polygon(v, fill, stroke='#4B554A', width=1.25):
    return f'<polygon points="{pts(v)}" fill="{fill}" stroke="{stroke}" stroke-width="{width}" stroke-linejoin="round"/>'

def line(a,b,color='#4B554A',width=1.25, extra=''):
    return f'<line x1="{a[0]:.2f}" y1="{a[1]:.2f}" x2="{b[0]:.2f}" y2="{b[1]:.2f}" stroke="{color}" stroke-width="{width}" {extra}/>'

def board(x,y,z,w,h,d):
    return ''.join([
        polygon([p(x,y,z),p(x+w,y,z),p(x+w,y,z+d),p(x,y,z+d)],'#FFFFFC'),
        polygon([p(x+w,y,z),p(x+w,y,z+d),p(x+w,y+h,z+d),p(x+w,y+h,z)],'#E2E5DA'),
        polygon([p(x,y,z),p(x+w,y,z),p(x+w,y+h,z),p(x,y+h,z)],'#F9FAF5')
    ])

def start(title,desc):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 850" role="img" aria-labelledby="title desc"><title id="title">{escape(title)}</title><desc id="desc">{escape(desc)}</desc><style>text{{font-family:Arial,sans-serif;font-size:15px;fill:#687261}}.dim{{stroke:#A7AE9D;stroke-width:1;fill:none}}</style>'''

def dimensions():
    a=[]
    # Height and width are measured on the front plane.
    for y in [120,771]:
        a.append(line((104,y),(143,y),'#A7AE9D',1))
        a.append(line((110,y-5),(120,y+5),'#A7AE9D',1))
    a.append(line((115,120),(115,771),'#A7AE9D',1))
    a.append('<text x="97" y="445.5" text-anchor="middle" transform="rotate(-90 97 445.5)">210 см</text>')
    for x in [155,527]:
        a.append(line((x,783),(x,816),'#A7AE9D',1))
        a.append(line((x-5,800),(x+5,810),'#A7AE9D',1))
    a.append(line((155,805),(527,805),'#A7AE9D',1))
    a.append('<text x="341" y="832" text-anchor="middle">120 см</text>')
    a.append(line((545,135),(641,71),'#A7AE9D',1))
    for x,y in [(545,135),(641,71)]:
        a.append(line((x-4,y-6),(x+4,y+6),'#A7AE9D',1))
    a.append('<text x="607" y="120" transform="rotate(-33.69 607 120)" text-anchor="middle">40 см</text>')
    return ''.join(a)

def shell_base():
    a=[]
    a.append(polygon([p(0,2100),p(1200,2100),p(1200,2100,400),p(0,2100,400)],'#E7E9DE',stroke='none'))
    # Back panel: no guessed fixing points.
    a.append(polygon([p(16,16,383.5),p(1184,16,383.5),p(1184,2004,383.5),p(16,2004,383.5)],'#EDF0E5'))
    a.append(board(0,0,0,16,2099,383.5))
    a.append(board(16,2020,16,1168,79.5,16))
    a.append(board(16,2004,0,1168,16,383.5))
    return ''.join(a)

def open_cabinet():
    a=[start('Вилета 6. Открытый шкаф', 'Изометрическая схема шкафа шириной 120, глубиной 40 и высотой 210 сантиметров. Слева узкая секция с пятью полками. Справа широкая секция со штангой и верхними и нижними отделениями. Расположение левых полок на обложке условное; сборочные шаги содержат точную схему.'),shell_base()]
    # Upper cubbies and lower cubbies, supplied clear partition heights.
    a.append(board(788,16,0,16,426,383.5))
    a.append(board(788,1707.6,0,16,296.4,383.5))
    # Rail: silhouette only, with no speculative brackets.
    a.append(line(p(422,580,190),p(1170,580,190),'#626B5D',5,'stroke-linecap="round"'))
    a.append(line(p(422,574,190),p(1170,574,190),'#B6BDAE',1.4,'stroke-linecap="round"'))
    a.append(board(408,1000,367.5,776,199,16))
    a.append(board(408,1691.6,0,776,16,383.5))
    a.append(board(408,442,0,776,16,383.5))
    for y in [1691.6,1379.2,1066.8,754.4,442]:
        a.append(board(16,y,0,376,16,383.5))
    a.append(board(392,16,0,16,1988,383.5))
    a.append(board(1184,0,0,16,2099,383.5))
    a.append(board(16,0,0,1168,16,383.5))
    a.append(dimensions())
    a.append('</svg>')
    return ''.join(a)

def closed_cabinet():
    a=[start('Вилета 6. Закрытый шкаф', 'Изометрическая схема шкафа с шестью белыми дверями: тремя короткими сверху и тремя длинными снизу. На нижних дверях три длинные тёмные ручки. Размеры шкафа 120 на 40 на 210 сантиметров.'),shell_base()]
    a.append(board(1184,0,0,16,2099,383.5))
    a.append(board(16,0,0,1168,16,383.5))
    # Decorative fronts: exact supplied 445 and 1565 mm heights, with no drill marks.
    for x in [2,402.5,803]:
        a.append(board(x,16,-16.5,395,445,16))
        a.append(board(x,465,-16.5,395,1565,16))
    # Deliberately long black handles as visible on the supplied product description.
    for x in [347,747,847]:
        a.append(line(p(x,690,-29),p(x,1230,-29),'#252D25',5.2,'stroke-linecap="round"'))
    a.append(dimensions())
    a.append('</svg>')
    return ''.join(a)

(OUT/'hero-open.svg').write_text(open_cabinet(),encoding='utf-8')
(OUT/'hero-closed.svg').write_text(closed_cabinet(),encoding='utf-8')
print('Created hero-open.svg and hero-closed.svg')
