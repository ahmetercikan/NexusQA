// Nexus QA - Jenkins Pipeline
// AI Agent-powered test automation with mobile support
//
// Features:
// - Multi-browser web testing
// - Mobile testing (iOS/Android)
// - AI Agent integration
// - Parallel execution
// - Slack/Teams notifications

pipeline {
    agent any

    // Environment variables
    environment {
        NODE_VERSION = '18'
        PYTHON_VERSION = '3.12'
        NEXUS_QA_API = credentials('nexus-qa-api-url')
        OPENAI_API_KEY = credentials('openai-api-key')
        ANTHROPIC_API_KEY = credentials('anthropic-api-key')
        SLACK_WEBHOOK = credentials('slack-webhook-url')
        TEAMS_WEBHOOK = credentials('teams-webhook-url')
    }

    // Build parameters
    parameters {
        choice(
            name: 'TEST_SUITE',
            choices: ['all', 'web', 'mobile', 'agents'],
            description: 'Which test suite to run'
        )
        choice(
            name: 'BROWSER',
            choices: ['all', 'chromium', 'firefox', 'webkit'],
            description: 'Browser for web tests'
        )
        booleanParam(
            name: 'RUN_MOBILE_TESTS',
            defaultValue: true,
            description: 'Run mobile tests (iOS/Android)'
        )
        booleanParam(
            name: 'SEND_NOTIFICATIONS',
            defaultValue: true,
            description: 'Send Slack/Teams notifications'
        )
    }

    // Triggers
    triggers {
        // Poll SCM every 15 minutes
        pollSCM('H/15 * * * *')
        // Nightly build at 2 AM
        cron('0 2 * * *')
    }

    options {
        // Keep last 30 builds
        buildDiscarder(logRotator(numToKeepStr: '30'))
        // Timeout after 1 hour
        timeout(time: 1, unit: 'HOURS')
        // Timestamps in console output
        timestamps()
        // Disable concurrent builds
        disableConcurrentBuilds()
    }

    stages {
        // ==================== SETUP ====================
        stage('Setup') {
            steps {
                script {
                    echo '🔧 Setting up Nexus QA environment...'

                    // Clean workspace
                    cleanWs()

                    // Checkout code
                    checkout scm

                    // Validate configuration
                    sh '''
                        if [ ! -f "backend/playwright.config.js" ]; then
                            echo "❌ Playwright config not found"
                            exit 1
                        fi
                        echo "✅ Configuration validated"
                    '''
                }
            }
        }

        // ==================== INSTALL DEPENDENCIES ====================
        stage('Install Dependencies') {
            parallel {
                stage('Node.js Dependencies') {
                    steps {
                        script {
                            echo '📦 Installing Node.js dependencies...'
                            dir('backend') {
                                sh '''
                                    npm ci
                                    npx playwright install --with-deps
                                '''
                            }
                        }
                    }
                }

                stage('Python Dependencies (AI Agents)') {
                    steps {
                        script {
                            echo '🐍 Installing Python dependencies...'
                            dir('agents') {
                                sh '''
                                    python3 -m venv .venv
                                    . .venv/bin/activate
                                    pip install -r requirements.txt
                                '''
                            }
                        }
                    }
                }
            }
        }

        // ==================== WEB TESTS ====================
        stage('Web Tests') {
            when {
                expression { params.TEST_SUITE == 'all' || params.TEST_SUITE == 'web' }
            }
            parallel {
                stage('Chromium') {
                    when {
                        expression { params.BROWSER == 'all' || params.BROWSER == 'chromium' }
                    }
                    steps {
                        script {
                            echo '🧪 Running tests on Chromium...'
                            dir('backend') {
                                sh 'npx playwright test --project=chromium --reporter=html,json,junit'
                            }
                        }
                    }
                    post {
                        always {
                            junit 'backend/results.xml'
                            publishHTML([
                                allowMissing: false,
                                alwaysLinkToLastBuild: true,
                                keepAll: true,
                                reportDir: 'backend/playwright-report',
                                reportFiles: 'index.html',
                                reportName: 'Playwright Report - Chromium'
                            ])
                        }
                    }
                }

                stage('Firefox') {
                    when {
                        expression { params.BROWSER == 'all' || params.BROWSER == 'firefox' }
                    }
                    steps {
                        script {
                            echo '🧪 Running tests on Firefox...'
                            dir('backend') {
                                sh 'npx playwright test --project=firefox --reporter=html,json,junit'
                            }
                        }
                    }
                }

                stage('WebKit') {
                    when {
                        expression { params.BROWSER == 'all' || params.BROWSER == 'webkit' }
                    }
                    steps {
                        script {
                            echo '🧪 Running tests on WebKit...'
                            dir('backend') {
                                sh 'npx playwright test --project=webkit --reporter=html,json,junit'
                            }
                        }
                    }
                }
            }
        }

        // ==================== MOBILE TESTS ====================
        stage('Mobile Tests') {
            when {
                expression {
                    params.RUN_MOBILE_TESTS &&
                    (params.TEST_SUITE == 'all' || params.TEST_SUITE == 'mobile')
                }
            }
            parallel {
                stage('iOS Devices') {
                    steps {
                        script {
                            echo '📱 Running iOS mobile tests...'
                            def devices = ['iPhone 15 Pro', 'iPhone SE', 'iPad Air']
                            devices.each { device ->
                                dir('backend') {
                                    sh """
                                        echo "Testing on ${device}..."
                                        DEVICE_NAME="${device}" npx playwright test tests/generated/mobile-demo.spec.js --project=chromium
                                    """
                                }
                            }
                        }
                    }
                }

                stage('Android Devices') {
                    steps {
                        script {
                            echo '📱 Running Android mobile tests...'
                            def devices = ['Samsung Galaxy S24 Ultra', 'Google Pixel 8 Pro']
                            devices.each { device ->
                                dir('backend') {
                                    sh """
                                        echo "Testing on ${device}..."
                                        DEVICE_NAME="${device}" npx playwright test tests/generated/mobile-demo.spec.js --project=chromium
                                    """
                                }
                            }
                        }
                    }
                }
            }
            post {
                always {
                    archiveArtifacts artifacts: 'backend/screenshots/**/*.png', allowEmptyArchive: true
                }
            }
        }

        // ==================== AI AGENT TESTS ====================
        stage('AI Agent Tests') {
            when {
                expression { params.TEST_SUITE == 'all' || params.TEST_SUITE == 'agents' }
            }
            steps {
                script {
                    echo '🤖 Running AI Agent integration tests...'
                    dir('agents') {
                        sh '''
                            . .venv/bin/activate
                            python -m pytest tests/ -v --tb=short --junitxml=agent-results.xml || true
                        '''
                    }
                }
            }
            post {
                always {
                    junit 'agents/agent-results.xml'
                }
            }
        }

        // ==================== GENERATE REPORT ====================
        stage('Generate Report') {
            steps {
                script {
                    echo '📊 Generating consolidated test report...'

                    def report = """
# 🧪 Nexus QA Test Results

**Build:** ${env.BUILD_NUMBER}
**Branch:** ${env.BRANCH_NAME}
**Commit:** ${env.GIT_COMMIT?.take(7)}
**Started by:** ${env.BUILD_USER ?: 'Jenkins'}

## Test Results Summary

| Test Suite | Status |
|------------|--------|
| Web (Chromium) | ${currentBuild.result ?: 'RUNNING'} |
| Web (Firefox) | ${currentBuild.result ?: 'RUNNING'} |
| Web (WebKit) | ${currentBuild.result ?: 'RUNNING'} |
| Mobile (iOS) | ${params.RUN_MOBILE_TESTS ? (currentBuild.result ?: 'RUNNING') : 'SKIPPED'} |
| Mobile (Android) | ${params.RUN_MOBILE_TESTS ? (currentBuild.result ?: 'RUNNING') : 'SKIPPED'} |
| AI Agents | ${currentBuild.result ?: 'RUNNING'} |

---
🚀 Powered by Nexus QA - AI Agent Test Automation
"""

                    writeFile file: 'test-summary.md', text: report
                    archiveArtifacts artifacts: 'test-summary.md'
                }
            }
        }
    }

    // ==================== POST-BUILD ACTIONS ====================
    post {
        always {
            echo '🧹 Cleaning up...'
            // Archive test results
            archiveArtifacts artifacts: 'backend/playwright-report/**/*', allowEmptyArchive: true
            archiveArtifacts artifacts: 'backend/test-results/**/*', allowEmptyArchive: true
        }

        success {
            script {
                if (params.SEND_NOTIFICATIONS) {
                    echo '✅ Tests passed! Sending success notification...'
                    sendNotifications('SUCCESS')
                }
            }
        }

        failure {
            script {
                if (params.SEND_NOTIFICATIONS) {
                    echo '❌ Tests failed! Sending failure notification...'
                    sendNotifications('FAILURE')
                }
            }
        }

        unstable {
            script {
                if (params.SEND_NOTIFICATIONS) {
                    echo '⚠️ Tests unstable! Sending warning notification...'
                    sendNotifications('UNSTABLE')
                }
            }
        }
    }
}

// ==================== HELPER FUNCTIONS ====================

def sendNotifications(String status) {
    def color = status == 'SUCCESS' ? 'good' : (status == 'UNSTABLE' ? 'warning' : 'danger')
    def emoji = status == 'SUCCESS' ? '✅' : (status == 'UNSTABLE' ? '⚠️' : '❌')

    // Slack notification
    if (env.SLACK_WEBHOOK) {
        sh """
            curl -X POST ${env.SLACK_WEBHOOK} \\
                -H 'Content-Type: application/json' \\
                -d '{
                    "attachments": [{
                        "color": "${color}",
                        "title": "${emoji} Nexus QA Build #${env.BUILD_NUMBER} - ${status}",
                        "text": "Branch: ${env.BRANCH_NAME}\\nCommit: ${env.GIT_COMMIT?.take(7)}",
                        "fields": [
                            {"title": "Build", "value": "${env.BUILD_NUMBER}", "short": true},
                            {"title": "Duration", "value": "${currentBuild.durationString}", "short": true}
                        ],
                        "footer": "Nexus QA",
                        "ts": $(date +%s)
                    }]
                }'
        """
    }

    // Microsoft Teams notification
    if (env.TEAMS_WEBHOOK) {
        def themeColor = status == 'SUCCESS' ? '28a745' : (status == 'UNSTABLE' ? 'ffc107' : 'dc3545')
        sh """
            curl -X POST ${env.TEAMS_WEBHOOK} \\
                -H 'Content-Type: application/json' \\
                -d '{
                    "@type": "MessageCard",
                    "@context": "https://schema.org/extensions",
                    "summary": "Nexus QA Test Results",
                    "themeColor": "${themeColor}",
                    "title": "${emoji} Nexus QA Build #${env.BUILD_NUMBER}",
                    "sections": [{
                        "activityTitle": "Status: ${status}",
                        "activitySubtitle": "Branch: ${env.BRANCH_NAME}",
                        "facts": [
                            {"name": "Build", "value": "${env.BUILD_NUMBER}"},
                            {"name": "Commit", "value": "${env.GIT_COMMIT?.take(7)}"},
                            {"name": "Duration", "value": "${currentBuild.durationString}"}
                        ]
                    }],
                    "potentialAction": [{
                        "@type": "OpenUri",
                        "name": "View Build",
                        "targets": [{"os": "default", "uri": "${env.BUILD_URL}"}]
                    }]
                }'
        """
    }
}

// ==================== CONFIGURATION NOTES ====================
//
// Required Jenkins Credentials:
// - nexus-qa-api-url (Secret text): Your Nexus QA backend URL
// - openai-api-key (Secret text): OpenAI API key for Vision AI
// - anthropic-api-key (Secret text): Anthropic API key for AI Agents
// - slack-webhook-url (Secret text, optional): Slack webhook URL
// - teams-webhook-url (Secret text, optional): Microsoft Teams webhook URL
//
// Required Jenkins Plugins:
// - Pipeline
// - Git
// - HTML Publisher
// - JUnit
// - Credentials Binding
//
// 🚀 Powered by Nexus QA
// 📱 Supports Web + Mobile + AI Agents
