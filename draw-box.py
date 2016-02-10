import xml.etree.ElementTree as ET
import Image, ImageDraw

im = Image.open("000000.JPEG")
draw = ImageDraw.Draw(im)

tree = ET.parse('000000.xml')
root = tree.getroot()
for child in root:
    if child.tag == 'object':
        bndbox = child[2]
        box = [(float(bndbox[1].text),float(bndbox[3].text)),(float(bndbox[0].text),float(bndbox[2].text))]
        print(box)
        draw.rectangle(box, outline='red')

im.save('000000annotated.JPEG', 'JPEG')


