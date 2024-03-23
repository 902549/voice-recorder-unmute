FROM tiangolo/uwsgi-nginx-flask:python3.8-alpine
COPY ./app /app
RUN /usr/local/bin/python -m pip install --upgrade pip
RUN pip install -r /app/requirements.txt
