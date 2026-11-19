const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('workspace',{
  action:(type,data={})=>ipcRenderer.invoke('action',{type,data}),
  bounds:data=>ipcRenderer.send('bounds',data),
  onState:fn=>ipcRenderer.on('state',(_event,data)=>fn(data)),
  onSend:fn=>ipcRenderer.on('open-send',()=>fn()),
  onNotice:fn=>ipcRenderer.on('notice',(_event,data)=>fn(data))
});
