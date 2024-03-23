from flask import Flask
from flask import abort
from flask import make_response
from flask import redirect
from flask import render_template
from flask import request
from flask import session
from werkzeug.utils import secure_filename

import os
import uuid

app = Flask(__name__)

# Create a directory in a known location to save files to.
uploads_dir = os.path.join(app.instance_path, 'uploads')
os.makedirs(uploads_dir, exist_ok=True)

@app.route('/media/<image_id>')
def start_img(image_id):
    ## Replace this if statement with database query
    if image_id == 'default':
        image_url = "https://t4.ftcdn.net/jpg/00/84/13/15/360_F_84131506_fV8Szg1O5j9wB2ORZR6hxSv5PNCPIw0o.jpg"
    elif image_id == '3':
        image_url = "https://media.istockphoto.com/id/1494444256/photo/glowing-number-3-before-dark-background.webp?b=1&s=170667a&w=0&k=20&c=QQLNV6dyqth1HRjjQBFXoIEz55_eB0SzvgC0MP9DeVU="
    else:
        image_url = "https://t3.ftcdn.net/jpg/02/48/42/64/360_F_248426448_NVKLywWqArG2ADUxDq6QprtIzsF82dMF.jpg"
    ##
    response = make_response(render_template('welcome.html', image_url=image_url))
    response.set_cookie('image_id', image_id)
    response.set_cookie('image_url', image_url)
    return response

@app.route("/start")
def start():
    image_id = request.cookies.get('image_id')
    if image_id==None:
        response.set_cookie('image_id', 'default')
    response = make_response(redirect('/record'))
    session_id = uuid.uuid4().hex
    response.set_cookie('session_id', session_id)
    return response

@app.route("/")
@app.route("/restart")
def restart():
    response = make_response(redirect('/record'))
    session_id = uuid.uuid4().hex
    response.set_cookie('image_id', '')
    response.set_cookie('image_url', '')
    response.set_cookie('session_id', '')
    response.set_cookie('all_done', '')
    return response

@app.route("/record")
def record():
    session_id = request.cookies.get('session_id')
    image_id = request.cookies.get('image_id')
    image_url = request.cookies.get('image_url')
    if session_id:
        all_done = request.cookies.get('all_done')
        if all_done:
            return render_template("thanks.html")
        else:
            return render_template("record.html", image_url=image_url, image_id=image_id)
    else:
        return render_template('welcome.html', image_url=image_url)

@app.route('/upload', methods=['POST'])
def upload():
    session_id = request.cookies.get('session_id')
    if not session_id:
        make_response('No session', 400)
    image_id = request.cookies.get('image_id')
    filename = image_id + '_' + session_id + '_' + uuid.uuid4().hex + '.ogg'
    secure_name = secure_filename(filename)
    secure_path = os.path.join(uploads_dir, secure_name)
    with open(secure_path, 'wb') as f:
        f.write(request.stream.read())
    return make_response('All good')

# Change this to your own number before you deploy.
app.secret_key = '1233498398321423'

if __name__ == "__main__":
    app.run(debug=False, host='0.0.0.0', port=5001)
