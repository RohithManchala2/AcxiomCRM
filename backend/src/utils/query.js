export function parsePagination(query,defaultLimit=10,maxLimit=100){
  const page=query.page===undefined?1:Number(query.page);
  const limit=query.limit===undefined?defaultLimit:Number(query.limit);
  const errors={};
  if(!Number.isInteger(page)||page<1)errors.page='Page must be a positive integer';
  if(!Number.isInteger(limit)||limit<1)errors.limit='Limit must be a positive integer';
  if(Object.keys(errors).length)return {page:1,limit:defaultLimit,errors};
  return {page,limit:Math.min(limit,maxLimit),errors};
}

export function parseDateRange(query,field='createdAt'){
  const filter={};
  const errors={};
  let from,to;
  if(query.from!==undefined){
    from=new Date(query.from);
    if(!Number.isFinite(from.getTime()))errors.from='From date is invalid';
    else filter.$gte=from;
  }
  if(query.to!==undefined){
    to=new Date(query.to);
    if(!Number.isFinite(to.getTime()))errors.to='To date is invalid';
    else{to.setHours(23,59,59,999);filter.$lte=to}
  }
  if(from&&to&&from>to)errors.to='To date must be on or after the from date';
  return {filter:Object.keys(filter).length?{[field]:filter}:{},errors};
}

export function scopedFilter(scope,filter){
  return Object.keys(filter).length?{$and:[scope,filter]}:scope;
}
