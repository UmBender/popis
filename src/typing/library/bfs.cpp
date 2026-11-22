while (!q.empty()) {
    int actual = q.front();
    q.pop();
    for (int next : adj[actual]) {
        if (!acessed[next]) {
            acessed[next] = true;
            q.push(next);
        }
    }
}
