package dev.naru.mobile.preview;

import android.app.*;
import android.os.*;
import android.content.*;
import android.content.pm.PackageInfo;
import android.graphics.Color;
import android.graphics.Rect;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.net.http.SslError;
import android.view.*;
import android.webkit.*;
import android.widget.*;
import org.json.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

/** Android compatibility preview. Remote pages receive no JavaScript native bridge. */
public final class MainActivity extends Activity {
  private static final int MAX_TABS=30, EXPORT=41;
  private static final String FIXTURE="file:///android_asset/fixture.html";
  private final ArrayList<Tab> tabs=new ArrayList<>();
  private final ArrayList<JSONObject> events=new ArrayList<>();
  private final ArrayList<String> clips=new ArrayList<>();
  private LinearLayout root,tabStrip; private HorizontalScrollView tabScroll; private FrameLayout content;
  private Tab active; private JSONObject services; private String inputCode,webViewVersion="not-loaded"; private boolean busy=false,collect=true,restoring=false;
  private TextView notice; private final Handler handler=new Handler(Looper.getMainLooper());
  private class Tab { String alias,url,service; Page view; final LinkedHashSet<String> fields=new LinkedHashSet<>(); boolean loaded=false,failed=false; }
  private interface Result { void value(Object value); }

  @Override public void onCreate(Bundle state) {
    super.onCreate(state);
    try {services=new JSONObject(asset("services.json"));inputCode=asset("input-bridge.js");}catch(Exception e){throw new IllegalStateException("Missing bundled assets");}
    collect=getSharedPreferences("diagnostic-settings",MODE_PRIVATE).getBoolean("enabled",true);restoreDiagnostics();
    root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setBackgroundColor(Color.rgb(247,248,251));root.setFitsSystemWindows(true);
    root.setOnApplyWindowInsetsListener((v,insets)->{if(Build.VERSION.SDK_INT>=30){android.graphics.Insets bars=insets.getInsets(WindowInsets.Type.systemBars());v.setPadding(bars.left,bars.top,bars.right,bars.bottom);}else v.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());return insets;});
    LinearLayout toolbar=new LinearLayout(this);toolbar.setGravity(Gravity.CENTER_VERTICAL);toolbar.setPadding(dp(4),0,dp(4),0);
    tabScroll=new HorizontalScrollView(this);tabScroll.setHorizontalScrollBarEnabled(false);tabStrip=new LinearLayout(this);tabStrip.setGravity(Gravity.CENTER_VERTICAL);tabScroll.addView(tabStrip);
    toolbar.addView(tabScroll,new LinearLayout.LayoutParams(0,dp(48),1));toolbar.addView(button("＋",v->addMenu()),new LinearLayout.LayoutParams(dp(44),dp(44)));toolbar.addView(button("···",v->more()),new LinearLayout.LayoutParams(dp(44),dp(44)));
    root.addView(toolbar);notice=new TextView(this);notice.setTextSize(11);notice.setTextColor(Color.rgb(85,97,144));notice.setPadding(dp(12),dp(6),dp(12),dp(6));notice.setText("Android 호환성 시험판 · 선택 글은 길게 눌러 전달");root.addView(notice);
    content=new FrameLayout(this);root.addView(content,new LinearLayout.LayoutParams(-1,0,1));setContentView(root);
    restore();if(tabs.isEmpty()){TextView empty=new TextView(this);empty.setText("PLYNT\n\n＋로 작업을 여세요\n\n최대 30개 탭 · 길게 눌러 글 전달\n멀티뷰는 현재 데스크톱에서 지원합니다.");empty.setTextSize(16);empty.setGravity(Gravity.CENTER);empty.setTextColor(Color.rgb(112,123,147));content.addView(empty);}
    log("app.start","web","ok",null);
    // Explicit debug-only test entry, analogous to desktop --fixtures. No credentials.
    if(state==null&&(getApplicationInfo().flags & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE)!=0){String service=getIntent().getStringExtra("test_service");if(service!=null&&services.has(service)&&!service.equals("web")){handler.post(()->{JSONObject s=services.optJSONObject(service);add(s.optString("name"),s.optString("url"),service,true);});}else if(getIntent().getBooleanExtra("test_fixtures",false)){handler.post(()->{add("시험 A",FIXTURE,"fixture",true);add("시험 B",FIXTURE,"fixture",true);});}}
  }
  private int dp(float value){return Math.round(value*getResources().getDisplayMetrics().density);}
  private String asset(String file)throws IOException{try(InputStream in=getAssets().open(file);ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] buffer=new byte[8192];int n;while((n=in.read(buffer))!=-1)out.write(buffer,0,n);return out.toString("UTF-8");}}
  private Button button(String label,View.OnClickListener action){Button b=new Button(this);b.setText(label);b.setTextSize(13);b.setAllCaps(false);b.setMinWidth(0);b.setMinimumWidth(0);b.setPadding(dp(8),0,dp(8),0);b.setBackgroundColor(Color.TRANSPARENT);b.setTextColor(Color.rgb(63,74,100));b.setOnClickListener(action);return b;}
  private void message(String text){notice.setText(text);}
  private boolean valid(String url){try{Uri u=Uri.parse(url);return "https".equals(u.getScheme())&&u.getHost()!=null&&u.getUserInfo()==null;}catch(Exception e){return false;}}
  private boolean login(Tab t){String url=t.view==null||t.view.getUrl()==null?t.url:t.view.getUrl();if(url==null)return true;String p=Uri.parse(url).getPath();return p!=null&&p.matches("(?i).*/(auth|oauth|authorize|callback|login|log-in|signin|sign-in|signup|sign-up|register)(/.*)?$");}
  private boolean restorable(String url){if(FIXTURE.equals(url))return true;if(!valid(url))return false;Uri u=Uri.parse(url);String p=u.getPath();if(p!=null&&p.matches("(?i).*/(auth|oauth|authorize|callback|login|log-in|signin|sign-in|signup|sign-up|register)(/.*)?$"))return false;for(String k:u.getQueryParameterNames())if(k.matches("(?i).*(token|code|secret|password|credential|session|ticket|assertion).*"))return false;return true;}
  private Tab add(String alias,String url,String service,boolean show){
    if(tabs.size()>=MAX_TABS){message("탭은 최대 30개입니다. 사용하지 않는 탭을 닫아 주세요.");return null;}
    if(url!=null&&!FIXTURE.equals(url)&&!valid(url)){message("HTTPS 웹 주소를 입력해 주세요.");return null;}
    Tab t=new Tab();t.alias=alias;t.url=url;t.service=service;t.view=new Page(t);configure(t);tabs.add(t);
    if(show)activate(t);else paintTabs();save();log("tab.open",service,"ok",null);return t;
  }
  private void configure(Tab t){
    WebView.setWebContentsDebuggingEnabled((getApplicationInfo().flags & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE)!=0);
    PackageInfo provider=WebView.getCurrentWebViewPackage();webViewVersion=provider==null?"unknown":provider.versionName;
    WebSettings s=t.view.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);s.setAllowFileAccess(false);s.setAllowContentAccess(false);s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);s.setSafeBrowsingEnabled(true);s.setSupportMultipleWindows(true);s.setJavaScriptCanOpenWindowsAutomatically(false);
    CookieManager.getInstance().setAcceptThirdPartyCookies(t.view,false);
    t.view.setWebViewClient(new WebViewClient(){
      @Override public boolean shouldOverrideUrlLoading(WebView w,WebResourceRequest r){String u=r.getUrl().toString();if(valid(u))return false;message("이 링크 형식은 시험판에서 열 수 없습니다.");return true;}
      @Override public void onPageStarted(WebView w,String u,android.graphics.Bitmap icon){t.fields.clear();t.failed=false;}
      @Override public void onPageFinished(WebView w,String u){if(restorable(u)){t.url=u;save();}log("page.load",t.service,t.failed?"error":"ok",null);}
      @Override public void onReceivedError(WebView w,WebResourceRequest r,WebResourceError e){if(r.isForMainFrame()){t.failed=true;log("page.failure",t.service,"error",e.getErrorCode());message("페이지 로딩 실패 · 진단 보고서를 확인해 주세요.");}}
      @Override public void onReceivedSslError(WebView w,SslErrorHandler h,SslError e){h.cancel();t.failed=true;log("page.failure",t.service,"tls-blocked",e.getPrimaryError());message("서버 인증서를 확인할 수 없어 연결을 중단했습니다.");}
      @Override public boolean onRenderProcessGone(WebView w,RenderProcessGoneDetail detail){log("page.crash",t.service,"error",null);if(w.getParent()!=null)((android.view.ViewGroup)w.getParent()).removeView(w);w.destroy();t.view=null;t.loaded=false;t.fields.clear();if(active==t){content.removeAllViews();LinearLayout box=new LinearLayout(MainActivity.this);box.setOrientation(LinearLayout.VERTICAL);box.setGravity(Gravity.CENTER);TextView text=new TextView(MainActivity.this);text.setText("웹 화면이 종료됐습니다.\n탭 이름과 주소는 유지됩니다.");text.setGravity(Gravity.CENTER);box.addView(text);box.addView(button("이 탭 다시 열기",v->activate(t)));content.addView(box,new FrameLayout.LayoutParams(-1,-1));}message("웹 화면 종료 · 탭은 보존했습니다. 진단 보고서를 확인하세요.");return true;}
    });
    t.view.setWebChromeClient(new WebChromeClient(){
      @Override public void onPermissionRequest(PermissionRequest request){request.deny();}
      @Override public boolean onCreateWindow(WebView source,boolean dialog,boolean gesture,Message result){if(!gesture)return false;Tab popup=add("로그인 창",null,t.service,false);if(popup==null)return false;popup.loaded=true;((WebView.WebViewTransport)result.obj).setWebView(popup.view);result.sendToTarget();activate(popup);return true;}
      @Override public void onCloseWindow(WebView view){close(t);}
    });
  }
  private void activate(Tab t){if(!tabs.contains(t))return;active=t;content.removeAllViews();if(t.view==null){t.view=new Page(t);configure(t);}if(t.view.getParent()!=null)((android.view.ViewGroup)t.view.getParent()).removeView(t.view);content.addView(t.view,new FrameLayout.LayoutParams(-1,-1));if(!t.loaded&&t.url!=null){t.loaded=true;t.view.loadUrl(t.url);}paintTabs();save();}
  private void paintTabs(){tabStrip.removeAllViews();for(Tab t:tabs){TextView b=new TextView(this);b.setText((t.service.equals("fixture")?"◈ ":"")+t.alias);b.setSingleLine(true);b.setMaxWidth(dp(160));b.setEllipsize(android.text.TextUtils.TruncateAt.END);b.setTextSize(12);b.setGravity(Gravity.CENTER);b.setPadding(dp(12),0,dp(12),0);b.setTextColor(t==active?Color.rgb(60,76,145):Color.rgb(117,125,144));GradientDrawable bg=new GradientDrawable();bg.setCornerRadius(dp(8));bg.setColor(t==active?Color.rgb(234,239,255):Color.TRANSPARENT);if(t==active)bg.setStroke(dp(1),Color.rgb(211,220,248));b.setBackground(bg);LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(-2,dp(36));p.setMargins(dp(2),dp(4),dp(2),dp(4));tabStrip.addView(b,p);b.setOnClickListener(v->activate(t));b.setOnLongClickListener(v->{tabMenu(t);return true;});if(t==active)b.post(()->tabScroll.smoothScrollTo(Math.max(0,b.getLeft()-dp(16)),0));}}
  private void close(Tab t){if(!tabs.remove(t))return;if(t.view!=null){if(t.view.getParent()!=null)((android.view.ViewGroup)t.view.getParent()).removeView(t.view);t.view.destroy();}if(active==t){active=null;if(!tabs.isEmpty())activate(tabs.get(tabs.size()-1));else content.removeAllViews();}paintTabs();save();log("tab.close",t.service,"ok",null);}
  private void addMenu(){ArrayList<String> keys=new ArrayList<>(),names=new ArrayList<>();Iterator<String> it=services.keys();while(it.hasNext()){String k=it.next();if(k.equals("web"))continue;keys.add(k);names.add(services.optJSONObject(k).optString("name"));}names.add("웹 주소로 열기");names.add("합성 시험 화면");new AlertDialog.Builder(this).setTitle("작업 추가 · "+tabs.size()+"/30").setItems(names.toArray(new String[0]),(d,i)->{if(i<keys.size()){String k=keys.get(i);JSONObject s=services.optJSONObject(k);add(s.optString("name"),s.optString("url"),k,true);}else if(i==keys.size())urlDialog();else add("시험 "+(tabs.size()+1),FIXTURE,"fixture",true);}).show();}
  private void urlDialog(){EditText input=new EditText(this);input.setSingleLine(true);input.setHint("https://…");new AlertDialog.Builder(this).setTitle("웹 주소").setView(input).setPositiveButton("열기",(d,w)->add("웹",input.getText().toString().trim(),"web",true)).setNegativeButton("취소",null).show();}
  private void tabMenu(Tab t){new AlertDialog.Builder(this).setTitle(t.alias).setItems(new String[]{"별칭 바꾸기","이 탭 닫기"},(d,i)->{if(i==1)close(t);else{EditText input=new EditText(this);input.setText(t.alias);new AlertDialog.Builder(this).setTitle("별칭").setView(input).setPositiveButton("저장",(a,b)->{String name=input.getText().toString().trim();if(!name.isEmpty())t.alias=name.substring(0,Math.min(name.length(),60));paintTabs();save();}).setNegativeButton("취소",null).show();}}).show();}
  private void more(){new AlertDialog.Builder(this).setTitle("Plynt · Android 호환성 시험판").setItems(new String[]{"현재 입력칸 지정","보관한 글","새로고침","기본 브라우저에서 열기","진단 보고서","합성 화면 2개 열기"},(d,i)->{if(i==0&&active!=null)registerMenu(active);if(i==1)clipsMenu();if(i==2&&active!=null){if(active.view==null)activate(active);else active.view.reload();}if(i==3&&active!=null){String url=active.view==null?active.url:active.view.getUrl();if(valid(url))startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(url)));}if(i==4)diagnostics();if(i==5){add("시험 A",FIXTURE,"fixture",true);add("시험 B",FIXTURE,"fixture",true);}}).show();}
  private void js(Tab t,String op,JSONObject args,Result callback){if(!tabs.contains(t)||t.view==null){callback.value(null);return;}t.view.evaluateJavascript(inputCode+"\nPlyntInput.run("+JSONObject.quote(op)+","+args+")",raw->{try{callback.value(new JSONTokener(raw).nextValue());}catch(Exception e){callback.value(null);}});}
  private JSONObject args(String field,String text){JSONObject j=new JSONObject();try{j.put("field",field);if(text!=null)j.put("text",text);}catch(Exception ignored){}return j;}
  private void registerMenu(Tab t){new AlertDialog.Builder(this).setTitle("받을 입력칸 지정").setItems(new String[]{"프롬프트","가사","스타일"},(d,i)->{String f=new String[]{"prompt","lyrics","style"}[i];if(login(t)){message("로그인 후 입력칸을 지정하세요.");return;}js(t,"register",args(f,null),result->{boolean ok="ok".equals(result);if(ok)t.fields.add(f);else t.fields.remove(f);log("field.register",t.service,ok?"ok":"unsupported",null);message(ok?"입력칸 지정 완료 · 원문을 길게 눌러 보내세요.":"빈 텍스트 입력칸을 먼저 터치해 주세요.");});}).show();}
  private void destinations(String text){if(text==null||text.isEmpty()){message("전달할 글을 먼저 선택해 주세요.");return;}if(text.length()>50000){message("한 번에 5만 자까지 전달할 수 있습니다.");return;}ArrayList<Tab> to=new ArrayList<>();ArrayList<String> fields=new ArrayList<>(),labels=new ArrayList<>();for(Tab t:tabs)for(String f:t.fields){to.add(t);fields.add(f);labels.add(t.alias+" · "+fieldLabel(f));}if(labels.isEmpty()){message("대상 탭의 입력칸을 먼저 지정해 주세요.");return;}new AlertDialog.Builder(this).setTitle("다른 탭에 넣기").setItems(labels.toArray(new String[0]),(d,i)->transfer(text,to.get(i),fields.get(i))).show();}
  private String fieldLabel(String f){return f.equals("lyrics")?"가사":f.equals("style")?"스타일":"프롬프트";}
  private void transfer(String text,Tab t,String field){if(busy)return;if(login(t)){message("로그인 후 입력칸을 다시 지정하세요.");return;}busy=true;activate(t);t.view.requestFocus();t.view.post(()->js(t,"ready",args(field,null),ready->{if(!"ok".equals(ready)){finishTransfer(t,ready instanceof String?(String)ready:"error",text.length());return;}js(t,"insert",args(field,text),inserted->{if(!"ok".equals(inserted)){finishTransfer(t,inserted instanceof String?(String)inserted:"error",text.length());return;}handler.postDelayed(()->js(t,"inspect",args(field,text),result->{String status=result instanceof JSONObject?((JSONObject)result).optString("status","error"):"error";finishTransfer(t,status,text.length());}),350);});}));}
  private void finishTransfer(Tab t,String status,int chars){busy=false;JSONObject extra=new JSONObject();try{extra.put("chars",chars);}catch(Exception ignored){}log("transfer.result",t.service,status,null,extra);message(status.equals("exact")?"입력 완료 · 원문 일치. 전송·생성은 누르지 않았습니다.":status.equals("occupied")?"기존 입력을 보호해 전달을 중단했습니다.":status.equals("changed")?"입력 결과가 원문과 다릅니다. 줄바꿈을 확인하세요.":"입력칸이 바뀌었거나 입력할 수 없습니다. 다시 지정해 주세요.");}
  private void saveClip(String text){if(text==null||text.isEmpty()||text.length()>50000)return;clips.add(0,text);while(clips.size()>50)clips.remove(clips.size()-1);((android.content.ClipboardManager)getSystemService(CLIPBOARD_SERVICE)).setPrimaryClip(ClipData.newPlainText("Plynt",text));save();log("clip.saved","web","ok",null);message("선택한 글을 이 기기에 보관했습니다.");}
  private void clipsMenu(){if(clips.isEmpty()){message("보관한 글이 없습니다. 글을 길게 눌러 복사·보관하세요.");return;}String[] labels=clips.stream().map(x->x.substring(0,Math.min(55,x.length()))).toArray(String[]::new);new AlertDialog.Builder(this).setTitle("보관한 글").setItems(labels,(d,i)->destinations(clips.get(i))).show();}

  private final class Page extends WebView {
    final Tab tab;
    Page(Tab t){super(MainActivity.this);tab=t;}
    @Override public ActionMode startActionMode(ActionMode.Callback cb,int type){return super.startActionMode(wrap(cb),type);}
    @Override public ActionMode startActionMode(ActionMode.Callback cb){return super.startActionMode(wrap(cb));}
    private void addActions(android.view.Menu menu){if(menu.findItem(8761)==null)menu.add(876,8761,0,"다른 탭에 넣기");if(menu.findItem(8762)==null)menu.add(876,8762,1,"입력칸 지정");if(menu.findItem(8763)==null)menu.add(876,8763,2,"복사하고 보관");}
    private ActionMode.Callback wrap(ActionMode.Callback original){return new ActionMode.Callback2(){
      @Override public boolean onCreateActionMode(ActionMode mode,android.view.Menu menu){boolean ok=original.onCreateActionMode(mode,menu);if(ok){addActions(menu);log("selection.menu",tab.service,"ok",null);}return ok;}
      @Override public boolean onPrepareActionMode(ActionMode mode,android.view.Menu menu){original.onPrepareActionMode(mode,menu);addActions(menu);return true;}
      @Override public boolean onActionItemClicked(ActionMode mode,android.view.MenuItem item){int id=item.getItemId();if(id==8762){mode.finish();registerMenu(tab);return true;}if(id==8761||id==8763){js(tab,"selection",new JSONObject(),selected->{String text=selected instanceof String?(String)selected:"";mode.finish();if(id==8761)destinations(text);else saveClip(text);});return true;}return original.onActionItemClicked(mode,item);}
      @Override public void onDestroyActionMode(ActionMode mode){original.onDestroyActionMode(mode);}
      @Override public void onGetContentRect(ActionMode mode,View view,Rect rect){if(original instanceof ActionMode.Callback2)((ActionMode.Callback2)original).onGetContentRect(mode,view,rect);else super.onGetContentRect(mode,view,rect);}
    };}
  }
  private void save(){if(restoring)return;try{JSONObject s=new JSONObject();JSONArray a=new JSONArray();for(Tab t:tabs)if(restorable(t.url)){JSONObject j=new JSONObject();j.put("alias",t.alias);j.put("url",t.url);j.put("service",t.service);a.put(j);}s.put("tabs",a);s.put("active",tabs.indexOf(active));s.put("clips",new JSONArray(clips));getSharedPreferences("workspace",MODE_PRIVATE).edit().putString("state",s.toString()).apply();}catch(Exception ignored){message("작업 저장에 실패했습니다.");}}
  private void restore(){restoring=true;try{JSONObject s=new JSONObject(getSharedPreferences("workspace",MODE_PRIVATE).getString("state","{}"));JSONArray a=s.optJSONArray("tabs");if(a!=null)for(int i=0;i<Math.min(30,a.length());i++){JSONObject t=a.getJSONObject(i);if(restorable(t.optString("url")))add(t.optString("alias","작업"),t.getString("url"),t.optString("service","web"),false);}JSONArray c=s.optJSONArray("clips");if(c!=null)for(int i=0;i<Math.min(50,c.length());i++){String text=c.optString(i);if(text.length()<=50000)clips.add(text);}if(!tabs.isEmpty())activate(tabs.get(Math.max(0,Math.min(tabs.size()-1,s.optInt("active",0)))));}catch(Exception ignored){}finally{restoring=false;}}
  private JSONObject cleanEvent(JSONObject raw)throws JSONException{String event=raw.optString("event");if(!Arrays.asList("app.start","tab.open","tab.close","page.load","page.failure","page.crash","selection.menu","field.register","transfer.result","clip.saved").contains(event))return null;JSONObject e=new JSONObject();e.put("event",event);String service=raw.optString("service"),status=raw.optString("status");e.put("service",Arrays.asList("chatgpt","codex","claude","suno","midjourney","canva","web","fixture").contains(service)?service:"web");e.put("status",Arrays.asList("ok","error","unsupported","tls-blocked","exact","changed","occupied","gone","focus-failed").contains(status)?status:"error");String at=raw.optString("at");if(at.matches("[0-9TZ:.+-]{15,40}"))e.put("at",at);for(String key:new String[]{"errorCode","chars"})if(raw.opt(key) instanceof Number){long n=((Number)raw.get(key)).longValue();if(Math.abs(n)<=1000000)e.put(key,n);}return e;}
  private void restoreDiagnostics(){try(FileInputStream in=openFileInput("diagnostics.json");ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] b=new byte[8192];int n;while((n=in.read(b))!=-1){if(out.size()+n>512*1024)return;out.write(b,0,n);}JSONArray a=new JSONObject(out.toString("UTF-8")).optJSONArray("events");if(a!=null)for(int i=Math.max(0,a.length()-300);i<a.length();i++){JSONObject e=cleanEvent(a.getJSONObject(i));if(e!=null)events.add(e);}}catch(Exception ignored){}}
  private void log(String event,String service,String status,Integer code){log(event,service,status,code,null);}
  private void log(String event,String service,String status,Integer code,JSONObject extra){if(!collect)return;try{JSONObject raw=new JSONObject();raw.put("event",event);raw.put("service",service);raw.put("status",status);raw.put("at",java.time.Instant.now().toString());if(code!=null)raw.put("errorCode",code);if(extra!=null&&extra.has("chars"))raw.put("chars",extra.getInt("chars"));JSONObject e=cleanEvent(raw);if(e==null)return;events.add(e);while(events.size()>300)events.remove(0);try(FileOutputStream out=openFileOutput("diagnostics.json",MODE_PRIVATE)){out.write(report().getBytes(StandardCharsets.UTF_8));}}catch(Exception ignored){}}
  private String report(){try{JSONObject r=new JSONObject();r.put("app","Plynt Android compatibility preview");r.put("version","0.1.0-preview.3");r.put("android",Build.VERSION.RELEASE);r.put("webview",webViewVersion);r.put("events",new JSONArray(events));r.put("privacy","No prompts, URLs, aliases, credentials, cookies, screenshots or page console output.");return r.toString(2);}catch(Exception e){return "{}";}}
  private void diagnostics(){ScrollView scroll=new ScrollView(this);TextView text=new TextView(this);text.setText(report());text.setTextSize(11);text.setPadding(dp(16),dp(8),dp(16),dp(8));scroll.addView(text);new AlertDialog.Builder(this).setTitle("진단 보고서 · 자동 업로드 없음").setView(scroll).setPositiveButton("파일 저장",(d,i)->startActivityForResult(new Intent(Intent.ACTION_CREATE_DOCUMENT).setType("application/json").addCategory(Intent.CATEGORY_OPENABLE).putExtra(Intent.EXTRA_TITLE,"plynt-android-diagnostics.json"),EXPORT)).setNeutralButton(collect?"수집 끄기":"수집 켜기",(d,i)->{collect=!collect;getSharedPreferences("diagnostic-settings",MODE_PRIVATE).edit().putBoolean("enabled",collect).apply();}).setNegativeButton("기록 삭제",(d,i)->{events.clear();deleteFile("diagnostics.json");}).show();}
  @Override protected void onActivityResult(int request,int result,Intent data){super.onActivityResult(request,result,data);if(request==EXPORT&&result==RESULT_OK&&data!=null)try(OutputStream out=getContentResolver().openOutputStream(data.getData())){out.write(report().getBytes(StandardCharsets.UTF_8));message("진단 보고서를 저장했습니다.");}catch(Exception e){message("파일 저장에 실패했습니다.");}}
  @Override public void onBackPressed(){if(active!=null&&active.view!=null&&active.view.canGoBack())active.view.goBack();else super.onBackPressed();}
  @Override protected void onDestroy(){save();handler.removeCallbacksAndMessages(null);for(Tab t:tabs)if(t.view!=null){if(t.view.getParent()!=null)((android.view.ViewGroup)t.view.getParent()).removeView(t.view);t.view.destroy();}super.onDestroy();}
}
