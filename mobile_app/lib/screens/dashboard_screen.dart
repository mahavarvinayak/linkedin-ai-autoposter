import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/post_provider.dart';
import '../providers/analytics_provider.dart';
import '../providers/settings_provider.dart';
import '../theme/app_theme.dart';
import 'create_post_screen.dart';
import 'analytics_screen.dart';
import 'automation_screen.dart';
import 'history_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _currentIndex = 0;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    final postProvider = context.read<PostProvider>();
    final analyticsProvider = context.read<AnalyticsProvider>();
    final settingsProvider = context.read<SettingsProvider>();

    await Future.wait([
      postProvider.loadPosts(),
      analyticsProvider.loadAnalytics(),
      settingsProvider.loadSettings(),
    ]);
  }

  @override
  Widget build(BuildContext context) {
    final screens = [
      const _DashboardHome(),
      const CreatePostScreen(),
      const AnalyticsScreen(),
      const AutomationScreen(),
    ];

    return Scaffold(
      body: screens[_currentIndex],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.dashboard_outlined),
            activeIcon: Icon(Icons.dashboard),
            label: 'Dashboard',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.add_circle_outline),
            activeIcon: Icon(Icons.add_circle),
            label: 'Create',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.analytics_outlined),
            activeIcon: Icon(Icons.analytics),
            label: 'Analytics',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.settings_outlined),
            activeIcon: Icon(Icons.settings),
            label: 'Settings',
          ),
        ],
      ),
    );
  }
}

class _DashboardHome extends StatelessWidget {
  const _DashboardHome();

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: RefreshIndicator(
        onRefresh: () async {
          await context.read<AppAuthProvider>().refreshUser();
          await context.read<PostProvider>().loadPosts();
          await context.read<AnalyticsProvider>().loadAnalytics();
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'LinkFlow AI',
                        style: Theme.of(context)
                            .textTheme
                            .headlineSmall
                            ?.copyWith(fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Your AI posting dashboard',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: AppColors.textSecondary,
                            ),
                      ),
                    ],
                  ),
                  Row(
                    children: [
                      IconButton(
                        icon: const Icon(Icons.history),
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => const HistoryScreen(),
                            ),
                          );
                        },
                      ),
                      IconButton(
                        icon: const Icon(Icons.logout),
                        onPressed: () {
                          context.read<AppAuthProvider>().signOut();
                        },
                      ),
                    ],
                  ),
                ],
              ),

              const SizedBox(height: 24),

              // LinkedIn Connection Status
              _LinkedInStatusCard(),

              const SizedBox(height: 16),

              // Stats Row
              _StatsRow(),

              const SizedBox(height: 16),

              // Next Scheduled Post
              _NextPostCard(),

              const SizedBox(height: 16),

              // Today's Engagement
              _EngagementCard(),

              const SizedBox(height: 16),

              // Recent Posts
              _RecentPostsSection(),
            ],
          ),
        ),
      ),
    );
  }
}

class _LinkedInStatusCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Consumer<AppAuthProvider>(
      builder: (context, auth, _) {
        final connected = auth.isLinkedInConnected;
        return Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: connected
                        ? AppColors.success.withAlpha(30)
                        : AppColors.warning.withAlpha(30),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    connected ? Icons.link : Icons.link_off,
                    color: connected ? AppColors.success : AppColors.warning,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'LinkedIn',
                        style: Theme.of(context).textTheme.titleSmall,
                      ),
                      Text(
                        connected ? 'Connected' : 'Not connected',
                        style: TextStyle(
                          color: connected
                              ? AppColors.success
                              : AppColors.textSecondary,
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                ),
                if (!connected)
                  ElevatedButton(
                    onPressed: () => auth.connectLinkedIn(),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 8,
                      ),
                    ),
                    child: const Text('Connect'),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _StatsRow extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Consumer2<PostProvider, AnalyticsProvider>(
      builder: (context, posts, analytics, _) {
        return Row(
          children: [
            Expanded(
              child: _StatCard(
                icon: Icons.article_outlined,
                label: 'Published',
                value: '${posts.totalPosted}',
                color: AppColors.primary,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _StatCard(
                icon: Icons.schedule,
                label: 'Scheduled',
                value: '${posts.totalScheduled}',
                color: AppColors.accent,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _StatCard(
                icon: Icons.trending_up,
                label: 'Engagement',
                value: '${analytics.averageEngagementRate.toStringAsFixed(1)}%',
                color: AppColors.success,
              ),
            ),
          ],
        );
      },
    );
  }
}

class _StatCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;

  const _StatCard({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          children: [
            Icon(icon, color: color, size: 24),
            const SizedBox(height: 8),
            Text(
              value,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: AppColors.textSecondary,
                  ),
            ),
          ],
        ),
      ),
    );
  }
}

class _NextPostCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Consumer<PostProvider>(
      builder: (context, postProvider, _) {
        final next = postProvider.nextScheduledPost;
        return Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.schedule, color: AppColors.accent, size: 20),
                    const SizedBox(width: 8),
                    Text(
                      'Next Scheduled Post',
                      style: Theme.of(context).textTheme.titleSmall,
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                if (next != null) ...[
                  Text(
                    next.content.length > 120
                        ? '${next.content.substring(0, 120)}...'
                        : next.content,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: AppColors.textSecondary,
                        ),
                  ),
                  const SizedBox(height: 8),
                  if (next.scheduledTime != null)
                    Text(
                      'Scheduled: ${_formatDateTime(next.scheduledTime!)}',
                      style: TextStyle(
                        color: AppColors.accent,
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                ] else
                  Text(
                    'No posts scheduled',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: AppColors.textSecondary,
                        ),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }

  String _formatDateTime(DateTime dt) {
    return '${dt.day}/${dt.month}/${dt.year} at ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
  }
}

class _EngagementCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Consumer<AnalyticsProvider>(
      builder: (context, analytics, _) {
        return Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.insights, color: AppColors.primary, size: 20),
                    const SizedBox(width: 8),
                    Text(
                      'Engagement Overview',
                      style: Theme.of(context).textTheme.titleSmall,
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _EngagementMetric(
                      label: 'Impressions',
                      value: _formatNumber(analytics.totalImpressions),
                      icon: Icons.visibility_outlined,
                    ),
                    _EngagementMetric(
                      label: 'Likes',
                      value: _formatNumber(analytics.totalLikes),
                      icon: Icons.thumb_up_outlined,
                    ),
                    _EngagementMetric(
                      label: 'Comments',
                      value: _formatNumber(analytics.totalComments),
                      icon: Icons.comment_outlined,
                    ),
                    _EngagementMetric(
                      label: 'Shares',
                      value: _formatNumber(analytics.totalShares),
                      icon: Icons.share_outlined,
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  String _formatNumber(int number) {
    if (number >= 1000000) {
      return '${(number / 1000000).toStringAsFixed(1)}M';
    }
    if (number >= 1000) {
      return '${(number / 1000).toStringAsFixed(1)}K';
    }
    return '$number';
  }
}

class _EngagementMetric extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;

  const _EngagementMetric({
    required this.label,
    required this.value,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Icon(icon, color: AppColors.textSecondary, size: 20),
        const SizedBox(height: 6),
        Text(
          value,
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
        ),
        Text(
          label,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: AppColors.textSecondary,
                fontSize: 11,
              ),
        ),
      ],
    );
  }
}

class _RecentPostsSection extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Consumer<PostProvider>(
      builder: (context, postProvider, _) {
        final recentPosts = postProvider.posts.take(3).toList();
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Recent Posts',
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                ),
                TextButton(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => const HistoryScreen(),
                      ),
                    );
                  },
                  child: const Text('View All'),
                ),
              ],
            ),
            if (recentPosts.isEmpty)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Center(
                    child: Text(
                      'No posts yet. Create your first AI post!',
                      style: TextStyle(color: AppColors.textSecondary),
                    ),
                  ),
                ),
              )
            else
              ...recentPosts.map(
                (post) => Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            _StatusBadge(status: post.status),
                            const Spacer(),
                            if (post.createdAt != null)
                              Text(
                                '${post.createdAt!.day}/${post.createdAt!.month}/${post.createdAt!.year}',
                                style: const TextStyle(
                                  color: AppColors.textSecondary,
                                  fontSize: 12,
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          post.content.length > 100
                              ? '${post.content.substring(0, 100)}...'
                              : post.content,
                          style: const TextStyle(fontSize: 14),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
          ],
        );
      },
    );
  }
}

class _StatusBadge extends StatelessWidget {
  final String status;

  const _StatusBadge({required this.status});

  @override
  Widget build(BuildContext context) {
    Color color;
    String label;

    switch (status) {
      case 'posted':
        color = AppColors.success;
        label = 'Posted';
        break;
      case 'scheduled':
        color = AppColors.accent;
        label = 'Scheduled';
        break;
      case 'failed':
        color = AppColors.error;
        label = 'Failed';
        break;
      default:
        color = AppColors.textSecondary;
        label = 'Draft';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withAlpha(30),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
