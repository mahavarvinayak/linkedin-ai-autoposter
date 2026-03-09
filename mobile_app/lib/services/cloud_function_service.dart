import 'dart:convert';
import 'package:http/http.dart' as http;

/// Service that calls Firebase Cloud Functions for all sensitive operations.
/// LinkedIn tokens and API keys are NEVER stored or processed on the client.
class CloudFunctionService {
  // Set LINKFLOW_API_BASE_URL via --dart-define. Example:
  // https://your-project.vercel.app/api
  static const String _baseUrl = String.fromEnvironment(
    'LINKFLOW_API_BASE_URL',
    defaultValue:
        'https://us-central1-studio-1013588681-626a8.cloudfunctions.net',
  );

  final String _userToken;

  CloudFunctionService(this._userToken);

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $_userToken',
      };

  /// Initiate LinkedIn OAuth - returns the authorization URL
  Future<String> getLinkedInAuthUrl() async {
    final response = await http.get(
      Uri.parse('$_baseUrl/linkedinAuthUrl'),
      headers: _headers,
    );
    if (response.statusCode != 200) {
      throw Exception('Failed to get LinkedIn auth URL');
    }
    final data = json.decode(response.body);
    return data['url'] as String;
  }

  /// Exchange LinkedIn auth code for token (handled server-side)
  Future<Map<String, dynamic>> exchangeLinkedInCode(String code) async {
    final response = await http.post(
      Uri.parse('$_baseUrl/linkedinCallback'),
      headers: _headers,
      body: json.encode({'code': code}),
    );
    if (response.statusCode != 200) {
      throw Exception('Failed to exchange LinkedIn code');
    }
    return json.decode(response.body) as Map<String, dynamic>;
  }

  /// Generate an AI post via Cloud Function (uses server-side Gemini API key)
  Future<Map<String, dynamic>> generateAIPost({
    required String topic,
    String? category,
  }) async {
    final response = await http.post(
      Uri.parse('$_baseUrl/generatePost'),
      headers: _headers,
      body: json.encode({
        'topic': topic,
        'category': category ?? 'technology',
      }),
    );
    if (response.statusCode != 200) {
      throw Exception('Failed to generate AI post');
    }
    return json.decode(response.body) as Map<String, dynamic>;
  }

  /// Publish a post to LinkedIn via Cloud Function
  Future<Map<String, dynamic>> publishToLinkedIn({
    required String content,
    required String targetType,
    String? organizationId,
  }) async {
    final response = await http.post(
      Uri.parse('$_baseUrl/publishPost'),
      headers: _headers,
      body: json.encode({
        'content': content,
        'targetType': targetType,
        'organizationId': organizationId,
      }),
    );
    if (response.statusCode != 200) {
      throw Exception('Failed to publish to LinkedIn');
    }
    return json.decode(response.body) as Map<String, dynamic>;
  }

  /// Fetch analytics for a post
  Future<Map<String, dynamic>> fetchPostAnalytics(String postUrn) async {
    final response = await http.get(
      Uri.parse('$_baseUrl/fetchAnalytics?postUrn=$postUrn'),
      headers: _headers,
    );
    if (response.statusCode != 200) {
      throw Exception('Failed to fetch analytics');
    }
    return json.decode(response.body) as Map<String, dynamic>;
  }

  /// Update automation settings
  Future<void> updateAutomationSettings({
    required bool enabled,
    required String postingTime,
    required String targetType,
    String? organizationId,
  }) async {
    final response = await http.post(
      Uri.parse('$_baseUrl/updateAutomation'),
      headers: _headers,
      body: json.encode({
        'enabled': enabled,
        'postingTime': postingTime,
        'targetType': targetType,
        'organizationId': organizationId,
      }),
    );
    if (response.statusCode != 200) {
      throw Exception('Failed to update automation settings');
    }
  }

  /// Disconnect LinkedIn account
  Future<void> disconnectLinkedIn() async {
    final response = await http.post(
      Uri.parse('$_baseUrl/disconnectLinkedIn'),
      headers: _headers,
    );
    if (response.statusCode != 200) {
      throw Exception('Failed to disconnect LinkedIn');
    }
  }
}
