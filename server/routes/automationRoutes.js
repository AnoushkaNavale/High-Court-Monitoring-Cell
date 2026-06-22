const router=require("express").Router();
const {requireAuth}=require("../middleware/authMiddleware");
const c=require("../controllers/automationController");
router.get("/status",requireAuth,c.automationStatus);
router.post("/notifications",requireAuth,c.sendNotification);
router.post("/run-reminders",requireAuth,c.runReminders);
router.post("/poll-cause-list",requireAuth,c.pollCauseList);
module.exports=router;
