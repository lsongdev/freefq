#! /bin/sh
# chkconfig: 2345 55 25
### BEGIN INIT INFO
# Provides:          clash
# Required-Start:    $all
# Required-Stop:     $all
# Default-Start:     2 3 4 5
# Default-Stop:      0 1 6
# Description:       Enable service provided by daemon.
### END INIT INFO

touch /var/run/clash.pid

is_running() {
  pid=$(cat /var/run/clash.pid)
  [ ! "$pid" = "" ] && test -d "/proc/$pid";
}

start() {
  echo "Starting clash"
  if is_running; then
    echo "Already running ..."
    exit 1
  fi
  /usr/local/bin/clash -d /etc/clash > /var/log/clash.log 2>&1 &
  echo $! > /var/run/clash.pid
}

stop() {
  echo "Stopping clash"
  if is_running; then
    pid=$(cat /var/run/clash.pid)
    kill -9 "$pid"
  else
    echo "Not running."
  fi
}

status() {
  if is_running; then
    echo "running"
  else
    echo "stop"
  fi
}

case "$1" in
  start)
    start
    ;;
  stop)
    stop
    ;;
  restart)
    echo "Restarting clash"
    stop
    start
    ;;
  status)
    status
    ;;
  *)
    echo "Usage: /etc/init.d/clash {start|stop|restart}"
    exit 1
    ;;
esac

exit 0
