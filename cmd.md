pm2 start npm --name zero -- run start 
 

ssh -i vm2.pem azureuser@98.70.34.79 

pm2 start npm --name admin -- run start -- -p 3001
pm2 start npm --name guest -- run start -- -p 3002
pm2 start npm --name driver -- run start -- -p 3003
pm2 start npm --name frontdesk -- run start -- -p 3004
pm2 start npm --name superadmin -- run start -- -p 3005
pm2 start npm --name server -- run start


pm2 stop admin driver frontdesk guest superadmin server
pm2 delete admin driver frontdesk guest superadmin server