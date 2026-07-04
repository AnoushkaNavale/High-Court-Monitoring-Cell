const router=require("express").Router();
const {requireAuth,allowRoles}=require("../middleware/authMiddleware");
const c=require("../controllers/automationController");
const operators=allowRoles("JCP","HCMC_STAFF");
router.get("/status",requireAuth,operators,c.automationStatus);
router.post("/notifications",requireAuth,operators,c.sendNotification);
router.post("/run-reminders",requireAuth,operators,c.runReminders);
router.post("/poll-cause-list",requireAuth,operators,c.pollCauseList);
module.exports=router;
