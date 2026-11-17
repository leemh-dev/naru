const leaf=id=>({id});
const split=(axis,a,b,ratio=.5)=>({axis,ratio,a,b});
function preset(ids,mode){
  if(!ids.length)return null;if(ids.length===1)return leaf(ids[0]);
  if(mode==='columns')return split('x',leaf(ids[0]),preset(ids.slice(1),mode),1/ids.length);
  if(ids.length===2)return split('x',leaf(ids[0]),leaf(ids[1]));
  return split('y',preset(ids.slice(0,2),'columns'),preset(ids.slice(2),'columns'));
}
function ids(tree){return !tree?[]:tree.id?[tree.id]:[...ids(tree.a),...ids(tree.b)];}
function remove(tree,id){if(!tree)return null;if(tree.id)return tree.id===id?null:tree;const a=remove(tree.a,id),b=remove(tree.b,id);return !a?b:!b?a:{...tree,a,b};}
function replace(tree,id,replacement){if(!tree)return tree;if(tree.id)return tree.id===id?replacement:tree;return {...tree,a:replace(tree.a,id,replacement),b:replace(tree.b,id,replacement)};}
function move(tree,from,to,edge='center'){
  if(from===to||!ids(tree).includes(from)||!ids(tree).includes(to))return tree;
  if(edge==='center'){const walk=n=>n.id?leaf(n.id===from?to:n.id===to?from:n.id):{...n,a:walk(n.a),b:walk(n.b)};return walk(tree);}
  if(!['left','right','top','bottom'].includes(edge))return tree;
  const vertical=['top','bottom'].includes(edge),before=['left','top'].includes(edge);
  return replace(remove(tree,from),to,split(vertical?'y':'x',leaf(before?from:to),leaf(before?to:from)));
}
function resize(tree,route,ratio){if(!tree||tree.id)return tree;if(!route)return {...tree,ratio:Math.max(.15,Math.min(.85,ratio))};const k=route[0];if(!['a','b'].includes(k))return tree;return {...tree,[k]:resize(tree[k],route.slice(1),ratio)};}
function valid(tree,allowed,depth=0){
  if(!tree)return null;if(depth>8||typeof tree!=='object')return null;
  if(tree.id)return allowed.includes(tree.id)?leaf(tree.id):null;
  if(!['x','y'].includes(tree.axis)||typeof tree.ratio!=='number'||!Number.isFinite(tree.ratio))return null;
  const a=valid(tree.a,allowed,depth+1),b=valid(tree.b,allowed,depth+1);if(!a)return b;if(!b)return a;
  const result=split(tree.axis,a,b,Math.max(.15,Math.min(.85,tree.ratio)));return new Set(ids(result)).size===ids(result).length?result:null;
}
module.exports={preset,ids,remove,replace,move,resize,valid};
