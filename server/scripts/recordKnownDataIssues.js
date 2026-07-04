const pool = require("../db/pool");

const womenPsRows = [
  [374,"14920/2025"],[375,"15092/2025"],[376,"18806/2025"],
  [377,"22055/2025"],[378,"23040/2025"],[379,".27388/2025"],
  [380,"23540/2025"],[381,"21474/2025"],[382,"593/2025"],
];

async function main(){
  for(const [row,caseNo] of womenPsRows){
    await pool.query(
      `INSERT INTO import_issues(source_file,sheet_name,row_number,case_no,issue_type,source_value,details)
       VALUES('DBStructure.xlsx','CaseList',$1,$2,'UNKNOWN_POLICE_STATION','Women PS','Needs an authoritative West Zone police-station mapping before import')
       ON CONFLICT(source_file,sheet_name,row_number,issue_type) DO NOTHING`,
      [row,caseNo]
    );
  }
  const result=await pool.query(`SELECT COUNT(1)::int count FROM import_issues WHERE status='Open' AND source_value='Women PS'`);
  console.log(`Recorded ${result.rows[0].count} open Women PS mapping issues`);
}

main().catch((error)=>{console.error(error);process.exitCode=1;}).finally(()=>pool.end());
