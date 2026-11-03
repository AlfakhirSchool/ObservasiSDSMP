const {PrismaClient}=require('@prisma/client');const p=new PrismaClient();
(async()=>{try{
const g=await p.activityLog.groupBy({by:['action'],_count:true,orderBy:{_count:{action:'desc'}}});
console.log(JSON.stringify(g.map(x=>[x.action,x._count])));
const last=await p.activityLog.findMany({take:5,orderBy:{createdAt:'desc'},select:{action:true,actorName:true,actorRole:true,targetLabel:true,detail:true}});
console.log(JSON.stringify(last,null,1));
}finally{await p.$disconnect()}})()
