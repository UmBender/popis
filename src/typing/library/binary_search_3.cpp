while(l<=r){
    int m=(l+r)/2;
    if(check(m,pr)){
        ans=m;
        l=m+1;
    }else r=m-1;
}
