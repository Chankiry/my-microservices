'use client';

import { useAuth } from '@/lib/auth-context';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
                Welcome to{' '}
                <span className="text-blue-600">Microservices Platform</span>
              </h1>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                A modern, scalable platform built with enterprise-grade security powered by Keycloak. 
                Manage your applications with confidence.
              </p>
              <div className="flex flex-wrap gap-4">
                {isLoading ? (
                  <div className="animate-pulse bg-gray-200 h-12 w-32 rounded-lg"></div>
                ) : isAuthenticated ? (
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    Go to Dashboard
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                      Get Started
                    </Link>
                    <Link
                      href="/register"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                    >
                      Create Account
                    </Link>
                  </>
                )}
              </div>
            </div>
            
            <div className="hidden lg:block">
              <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-200">
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  </div>
                  <span className="text-sm text-gray-500">Dashboard Preview</span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="h-24 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg animate-pulse"></div>
                  <div className="h-24 bg-gradient-to-br from-green-100 to-green-200 rounded-lg animate-pulse"></div>
                  <div className="h-24 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg animate-pulse"></div>
                </div>
                <div className="mt-4 space-y-3">
                  <div className="h-4 bg-gray-100 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-100 rounded w-3/4 animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Powerful Features
            </h2>
            <p className="text-lg text-gray-500">
              Everything you need to manage your microservices platform
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                ),
                title: 'Secure Authentication',
                description: 'Enterprise-grade security with Keycloak, supporting OAuth2, OIDC, and SSO.',
              },
              {
                icon: (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                ),
                title: 'User Management',
                description: 'Comprehensive user administration with role-based access control.',
              },
              {
                icon: (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                  </svg>
                ),
                title: 'Real-time Monitoring',
                description: 'Track performance metrics and system health in real-time.',
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="bg-white p-8 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow"
              >
                <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-500">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Technology Stack
            </h2>
            <p className="text-lg text-gray-500">
              Built with modern, battle-tested technologies
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {[
              { name: 'Keycloak', desc: 'IAM', color: 'bg-gray-700' },
              { name: 'Kong', desc: 'Gateway', color: 'bg-blue-600' },
              { name: 'Kafka', desc: 'Messaging', color: 'bg-gray-900' },
              { name: 'PostgreSQL', desc: 'Database', color: 'bg-blue-700' },
              { name: 'Redis', desc: 'Cache', color: 'bg-red-600' },
              { name: 'Docker', desc: 'Container', color: 'bg-blue-500' },
            ].map((tech, index) => (
              <div
                key={index}
                className="bg-white p-6 rounded-xl border border-gray-200 text-center"
              >
                <div className={`w-12 h-12 ${tech.color} rounded-lg text-white flex items-center justify-center mx-auto mb-3 font-bold`}>
                  {tech.name.charAt(0)}
                </div>
                <div className="font-semibold text-gray-900">{tech.name}</div>
                <div className="text-sm text-gray-500">{tech.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-blue-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-lg text-blue-100 mb-8">
            Join our platform and start managing your microservices today.
          </p>
          <Link
            href={isAuthenticated ? '/dashboard' : '/register'}
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-700 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
          >
            {isAuthenticated ? 'Open Dashboard' : 'Create Free Account'}
          </Link>
        </div>
      </section>
    </div>
  );
}
