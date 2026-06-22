const {runRemindersInternal,pollCauseListInternal}=require("../controllers/automationController");

function indiaHour(){ return Number(new Intl.DateTimeFormat("en-IN",{timeZone:"Asia/Kolkata",hour:"2-digit",hour12:false}).format(new Date())); }

function startAutomationJobs(){
  const reminderTimer=setInterval(()=>runRemindersInternal().catch(console.error),60*60*1000);
  const pollTimer=setInterval(()=>{ const hour=indiaHour(); if(hour>=16&&hour<20) pollCauseListInternal().catch(console.error); },15*60*1000);
  reminderTimer.unref(); pollTimer.unref();
  console.log("HCMC reminder and cause-list polling jobs scheduled");
}
module.exports={startAutomationJobs};
