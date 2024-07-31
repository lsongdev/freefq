#!/bin/sh /etc/rc.common

START=99
STOP=15
USE_PROCD=1

CLASH_BIN=/usr/bin/clash
CONFIG_PATH=/etc/clash
LOG=/var/log/clash.log

ulimit -n 1000000
ulimit -u 1000000

start_service(){
  procd_open_instance
  procd_set_param command /bin/sh -c "$CLASH_BIN -d $CONFIG_PATH > $LOG"
  procd_set_param pidfile /var/run/clash.pid
  # procd_set_param limits core="unlimited"
  procd_set_param stderr 1
  procd_close_instance
}

stop_service(){
  pid=$(cat /var/run/clash.pid)
  [[ "$pid" ]] || exit
  kill $pid
}
