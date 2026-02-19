import { motion } from "framer-motion";
import { Users, Download, IndianRupee, TrendingUp, Search, Plus, Minus, Loader2, ExternalLink } from "lucide-react";
import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { toast } from "sonner";

interface UserRow {
  id: string;
  name: string;
  tokens: number;
  role: string;
  joined: string;
  user_id: string;
}

interface DownloadRow {
  id: string;
  user_id: string;
  user_name: string;
  video_url: string;
  video_title: string;
  quality: string;
  created_at: string;
}

const TOKEN_COST: Record<string, number> = {
  "360p": 1,
  "720p": 2,
  "1080p": 3,
  "4k": 4,
};

interface DownloadData {
  id: string;
  user_id: string;
  video_url: string;
  video_title: string;
  quality: string;
  created_at: string;
}

interface PaymentData {
  amount: number;
  tokens_purchased: number;
}

const Admin = () => {
  const [search, setSearch] = useState("");
  const [dlSearch, setDlSearch] = useState("");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [downloadRows, setDownloadRows] = useState<DownloadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"users" | "downloads">("users");
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDownloads: 0,
    totalRevenue: 0,
    totalTokensSold: 0,
  });
  const [downloadChartData, setDownloadChartData] = useState<{ name: string; downloads: number }[]>([]);
  const [revenueChartData, setRevenueChartData] = useState<{ name: string; revenue: number }[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Mock data for no-backend mode
      const profiles = [{ id: "1", user_id: "guest", name: "Guest User", tokens: 9999, created_at: new Date().toISOString() }];
      const roles = [{ user_id: "guest", role: "admin" }];
      const downloads: DownloadData[] = [];
      const payments: PaymentData[] = [];

      // Build user list
      const roleMap = new Map(roles.map((r) => [r.user_id, r.role]));
      const nameMap = new Map(profiles.map((p) => [p.user_id, p.name || "Unnamed"]));

      const userList: UserRow[] = profiles.map((p) => ({
        id: p.id,
        user_id: p.user_id,
        name: p.name || "Unnamed",
        tokens: p.tokens,
        role: roleMap.get(p.user_id) || "user",
        joined: new Date(p.created_at).toLocaleDateString(),
      }));
      setUsers(userList);

      // Build downloads list
      const dlRows: DownloadRow[] = downloads.map((d) => ({
        id: d.id,
        user_id: d.user_id,
        user_name: nameMap.get(d.user_id) || "Unknown",
        video_url: d.video_url,
        video_title: d.video_title,
        quality: d.quality,
        created_at: new Date(d.created_at).toLocaleString(),
      }));
      setDownloadRows(dlRows);

      // Stats
      const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const totalTokensSold = payments.reduce((sum, p) => sum + (p.tokens_purchased || 0), 0);
      setStats({
        totalUsers: profiles.length,
        totalDownloads: downloads.length,
        totalRevenue,
        totalTokensSold,
      });

      // Charts
      setDownloadChartData([]);
      setRevenueChartData([]);

    } catch (error) {
      toast.error("Failed to fetch admin data");
    } finally {
      setLoading(false);
    }
  };

  const handleAddTokens = async (userId: string, currentTokens: number) => {
    // Mock action
    toast.success("Added 10 tokens (Mock)");
    // In a real app, you'd call an API endpoint here
  };

  const handleRemoveTokens = async (userId: string, currentTokens: number) => {
    // Mock action
    toast.success("Removed 10 tokens (Mock)");
  };

  const filteredUsers = users.filter((u) => u.name.toLowerCase().includes(search.toLowerCase()));
  const filteredDownloads = downloadRows.filter(
    (d) =>
      d.user_name.toLowerCase().includes(dlSearch.toLowerCase()) ||
      d.video_title.toLowerCase().includes(dlSearch.toLowerCase()) ||
      d.video_url.toLowerCase().includes(dlSearch.toLowerCase())
  );

  const statCards = [
    { label: "Total Users", value: stats.totalUsers.toLocaleString(), icon: Users },
    { label: "Total Downloads", value: stats.totalDownloads.toLocaleString(), icon: Download },
    { label: "Revenue", value: `₹${stats.totalRevenue.toLocaleString()}`, icon: IndianRupee },
    { label: "Tokens Sold", value: stats.totalTokensSold.toLocaleString(), icon: TrendingUp },
  ];

  if (loading) {
    return (
      <div className="animated-gradient-bg min-h-screen pt-28 pb-20 px-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="animated-gradient-bg min-h-screen pt-28 pb-20 px-6">
      <div className="container mx-auto max-w-6xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-foreground mb-8">Admin Dashboard</h1>

          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {statCards.map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass-card-hover p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <stat.icon className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="glass-card p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4">Downloads Overview</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={downloadChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 15% 20%)" />
                  <XAxis dataKey="name" stroke="hsl(240 10% 60%)" fontSize={12} />
                  <YAxis stroke="hsl(240 10% 60%)" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(240 20% 12%)", border: "1px solid hsl(240 15% 20%)", borderRadius: "12px", color: "hsl(0 0% 96%)" }} />
                  <Bar dataKey="downloads" fill="hsl(244 100% 69%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="glass-card p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4">Revenue Trend</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={revenueChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 15% 20%)" />
                  <XAxis dataKey="name" stroke="hsl(240 10% 60%)" fontSize={12} />
                  <YAxis stroke="hsl(240 10% 60%)" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(240 20% 12%)", border: "1px solid hsl(240 15% 20%)", borderRadius: "12px", color: "hsl(0 0% 96%)" }} />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(247 100% 74%)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tab Toggle */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setActiveTab("users")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "users" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
            >
              Users ({users.length})
            </button>
            <button
              onClick={() => setActiveTab("downloads")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "downloads" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
            >
              Downloads ({downloadRows.length})
            </button>
          </div>

          {/* Users Table */}
          {activeTab === "users" && (
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-foreground">All Users</h3>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..." className="bg-secondary/50 border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 w-64" />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium">Name</th>
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium">Role</th>
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium">Tokens</th>
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium">Joined</th>
                      <th className="text-right py-3 px-4 text-muted-foreground font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No users found</td></tr>
                    ) : (
                      filteredUsers.map((user) => (
                        <tr key={user.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                          <td className="py-3 px-4 text-foreground font-medium">{user.name}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${user.role === "admin" ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"}`}>{user.role}</span>
                          </td>
                          <td className="py-3 px-4 text-foreground">{user.tokens}</td>
                          <td className="py-3 px-4 text-muted-foreground">{user.joined}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => handleAddTokens(user.user_id, user.tokens)} className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors" title="Add 10 tokens"><Plus className="h-4 w-4" /></button>
                              <button onClick={() => handleRemoveTokens(user.user_id, user.tokens)} className="p-1.5 rounded-lg hover:bg-accent/10 text-accent transition-colors" title="Remove 10 tokens"><Minus className="h-4 w-4" /></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Downloads Table */}
          {activeTab === "downloads" && (
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-foreground">All Downloads</h3>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input type="text" value={dlSearch} onChange={(e) => setDlSearch(e.target.value)} placeholder="Search downloads..." className="bg-secondary/50 border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 w-64" />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium">User</th>
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium">Video</th>
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium">Link</th>
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium">Quality</th>
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium">Tokens Used</th>
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium">Status</th>
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDownloads.length === 0 ? (
                      <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">No downloads found</td></tr>
                    ) : (
                      filteredDownloads.map((dl) => (
                        <tr key={dl.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                          <td className="py-3 px-4 text-foreground font-medium">{dl.user_name}</td>
                          <td className="py-3 px-4 text-foreground max-w-[200px] truncate">{dl.video_title}</td>
                          <td className="py-3 px-4">
                            <a href={dl.video_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1 text-xs">
                              <ExternalLink className="h-3 w-3" /> Link
                            </a>
                          </td>
                          <td className="py-3 px-4 text-foreground">{dl.quality}</td>
                          <td className="py-3 px-4 text-foreground">{TOKEN_COST[dl.quality] || 1}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-green-500/20 text-green-400">Success</span>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground text-xs">{dl.created_at}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Admin;
