with open('camera.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

css_lines = lines[15:130]

js_camera_p1 = lines[514:570]
js_effects_p1 = lines[570:814]
js_camera_p2 = lines[814:1325]
js_effects_p2 = lines[1325:1492]
js_camera_p3 = lines[1492:1494]

with open('css/camera.css', 'w', encoding='utf-8') as f:
    f.writelines(css_lines)

with open('js/effects.js', 'w', encoding='utf-8') as f:
    f.writelines(js_effects_p1)
    f.writelines(js_effects_p2)

with open('js/camera.js', 'w', encoding='utf-8') as f:
    f.writelines(js_camera_p1)
    f.writelines(js_camera_p2)
    f.writelines(js_camera_p3)

html_top = lines[:14]
html_link = ['    <link href="css/camera.css" rel="stylesheet" />\n']
html_middle = lines[131:513]
html_scripts = ['    <script src="js/effects.js"></script>\n', '    <script src="js/camera.js"></script>\n']
html_bottom = lines[1495:]

with open('camera.html', 'w', encoding='utf-8') as f:
    f.writelines(html_top + html_link + html_middle + html_scripts + html_bottom)
    
print("Extraction complete.")
